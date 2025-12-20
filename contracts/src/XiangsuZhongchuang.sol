// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.29 <0.9.0;

/// @title Xiangsu Zhongchuang (XSZC) - 像素众创 (xiàngsù zhòngchuàng) - Collective Pixel Artwork
/// @notice This contract implements an expanding collaborative pixel canvas with cooldown-based rate limiting
/// @dev The canvas uses a coordinate system from (-max, -max) to (max, max) and expands automatically when 80% filled
contract XiangsuZhongchuang {
    /// @notice Thrown when constructor receives a non-positive maximum coordinate value
    error MaxMustBePositive();

    /// @notice Thrown when attempting to access or modify coordinates outside the current grid bounds
    error CoordinatesOutOfBounds();

    /// @notice Thrown when a color index greater than 3 is provided
    error InvalidColorIndex();

    /// @notice Thrown when a user attempts to set a pixel before their cooldown period has elapsed
    error CooldownNotElapsed();

    /// @notice Thrown when attempting to clear a pixel would prevent grid expansion when the grid is expandable
    /// @dev This prevents users from blocking grid growth by clearing pixels when the canvas is at 80%+ capacity
    error BackToBlack();

    /// @notice Thrown when an invalid signature is provided or signature recovery fails
    error InvalidSignature();

    /// @notice Thrown when a signature's deadline has passed
    error SignatureExpired();

    /// @notice Emitted when a pixel is set to any color
    /// @param author Address that set the pixel
    /// @param x X coordinate of the pixel
    /// @param y Y coordinate of the pixel
    /// @param colorIndex New color index (0-3)
    /// @param previousColor Previous color index (0-3) before the change
    event PixelSet(address indexed author, int256 x, int256 y, uint8 colorIndex, uint8 previousColor);

    /// @notice Emitted when a non-zero pixel is overwritten by another non-zero color
    /// @param author Address that overwrote the pixel
    /// @param x X coordinate of the pixel
    /// @param y Y coordinate of the pixel
    /// @param newColor New color index (1-3, non-black)
    /// @param previousColor Previous color index (1-3, non-black)
    event PixelOverwritten(address indexed author, int256 x, int256 y, uint8 newColor, uint8 previousColor);

    /// @notice Emitted when a non-zero pixel is set to black (color index 0)
    /// @param author Address that cleared the pixel
    /// @param x X coordinate of the pixel
    /// @param y Y coordinate of the pixel
    /// @param previousColor Previous color index (1-3, non-black) that was cleared
    event PixelCleared(address indexed author, int256 x, int256 y, uint8 previousColor);

    /// @notice Emitted when the grid expands by one unit in all directions
    /// @param newMax New maximum coordinate value after expansion
    event GridExpanded(int256 newMax);

    /// @notice Maximum coordinate value; grid spans from (-max, -max) to (max, max)
    /// @dev This value increases by 1 when the grid expands via the expandGrid function
    int256 public max;

    /// @notice Color palette mapping indices to hex color codes
    /// @dev Index 0: black (#000000), 1: purple (#8c1c84), 2: blue (#45a2f8), 3: white (#FFFFFF)
    string[4] public colors = ["#000000", "#8c1c84", "#45a2f8", "#FFFFFF"];

    /// @notice Pixel color storage mapping coordinate keys to color indices
    /// @dev Key is generated via coordToKey(x, y), value is color index (0-3)
    mapping(bytes32 => uint8) public grid;

    /// @notice Pixel author storage mapping coordinate keys to author addresses
    /// @dev Key is generated via coordToKey(x, y), value is the address that last set the pixel
    mapping(bytes32 => address) public pixelAuthors;

    /// @notice Timestamp of the last pixel set by each address
    /// @dev Used to enforce the COOLDOWN_PERIOD between pixel placements
    mapping(address => uint256) public lastPixelTime;

    /// @notice Total number of pixels set by each author across the entire canvas lifetime
    /// @dev This counter increments every time an author sets a pixel, including overwrites
    mapping(address => uint256) public pixelCount;

    /// @notice Cooldown period between consecutive pixel placements by the same address
    /// @dev Set to 24 hours to rate-limit pixel placement
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    /// @notice EIP-712 domain separator for typed structured data hashing
    /// @dev Computed once in constructor using contract name, version, chain ID, and address
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice EIP-712 typehash for the SetPixel message structure
    /// @dev Used to create typed data hashes for signature verification in setPixelWithSignature
    bytes32 public constant SETPIXEL_TYPEHASH =
        keccak256("SetPixel(address author,int256 x,int256 y,uint8 colorIndex,uint256 deadline)");

    /// @notice Nonces for each address to prevent signature replay attacks
    /// @dev Currently unused but reserved for future implementation of replay protection
    mapping(address => uint256) public nonces;

    /// @notice Initialize the pixel canvas contract with an initial grid size
    /// @param _max Maximum coordinate value, must be positive (grid will span from -_max to +_max on both axes)
    /// @dev Also initializes the EIP-712 domain separator for signature verification
    constructor(int256 _max) {
        if (_max <= 0) revert MaxMustBePositive();
        max = _max;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("XiangsuZhongchuang")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Converts 2D coordinates to a unique bytes32 key for mapping storage
    /// @param x X coordinate of the pixel
    /// @param y Y coordinate of the pixel
    /// @return Unique bytes32 key derived from hashing the coordinates
    /// @dev Uses assembly for gas-efficient keccak256 hashing of the coordinate pair
    function coordToKey(int256 x, int256 y) public pure returns (bytes32) {
        bytes32 result;
        assembly {
            mstore(0x00, x)
            mstore(0x20, y)
            result := keccak256(0x00, 0x40)
        }
        return result;
    }

    /// @notice Validates whether the given coordinates are within the current grid boundaries
    /// @param x X coordinate to validate
    /// @param y Y coordinate to validate
    /// @return True if both coordinates are within [-max, max] range, false otherwise
    function isValidCoord(int256 x, int256 y) public view returns (bool) {
        return (x >= -max && x <= max && y >= -max && y <= max);
    }

    /// @notice Sets a pixel to the specified color at the given coordinates
    /// @param x X coordinate of the pixel to set
    /// @param y Y coordinate of the pixel to set
    /// @param colorIndex Color index to set (0=black, 1=purple, 2=blue, 3=white)
    /// @dev Enforces 24-hour cooldown between placements. When the grid is at 80%+ capacity,
    ///      prevents clearing pixels (setting to black) if doing so would drop below 80% threshold.
    ///      This "BackToBlack" protection ensures grid expansion can occur.
    function setPixel(int256 x, int256 y, uint8 colorIndex) public {
        if (!isValidCoord(x, y)) revert CoordinatesOutOfBounds();
        if (colorIndex >= 4) revert InvalidColorIndex();

        if (lastPixelTime[msg.sender] != 0) {
            if (block.timestamp < lastPixelTime[msg.sender] + COOLDOWN_PERIOD) {
                revert CooldownNotElapsed();
            }
        }

        bytes32 key = coordToKey(x, y);
        uint8 previousColor = grid[key];

        if (colorIndex == 0 && previousColor != 0) {
            bool wasExpandable = shouldExpandGrid();
            if (wasExpandable) {
                // casting to 'uint256' is safe because max is positive (enforced in constructor)
                // and max * 2 + 1 will always fit in uint256
                // forge-lint: disable-next-line(unsafe-typecast)
                uint256 totalPixels = uint256(max * 2 + 1) * uint256(max * 2 + 1);
                uint256 nonZeroCount = 0;

                for (int256 checkY = -max; checkY <= max; checkY++) {
                    for (int256 checkX = -max; checkX <= max; checkX++) {
                        bytes32 checkKey = coordToKey(checkX, checkY);
                        if (grid[checkKey] != 0 && checkKey != key) {
                            nonZeroCount++;
                        }
                    }
                }

                bool wouldBeExpandable = nonZeroCount * 100 >= totalPixels * 80;
                if (!wouldBeExpandable) revert BackToBlack();
            }
        }

        grid[key] = colorIndex;
        pixelAuthors[key] = msg.sender;
        lastPixelTime[msg.sender] = block.timestamp;
        pixelCount[msg.sender]++;

        emit PixelSet(msg.sender, x, y, colorIndex, previousColor);

        if (previousColor != 0 && colorIndex != 0) {
            emit PixelOverwritten(msg.sender, x, y, colorIndex, previousColor);
        } else if (previousColor != 0 && colorIndex == 0) {
            emit PixelCleared(msg.sender, x, y, previousColor);
        }
    }

    /// @notice Sets a pixel using an EIP-712 signature, allowing gasless transactions via relayers
    /// @param author Address of the pixel author who signed the message
    /// @param x X coordinate of the pixel to set
    /// @param y Y coordinate of the pixel to set
    /// @param colorIndex Color index to set (0=black, 1=purple, 2=blue, 3=white)
    /// @param deadline Unix timestamp after which the signature expires
    /// @param v ECDSA signature recovery identifier (27 or 28)
    /// @param r ECDSA signature r component
    /// @param s ECDSA signature s component
    /// @dev This function allows users to generate an EIP-712 compliant signature off-chain that
    ///      can be submitted by any address (e.g., a relayer). The signature is verified against
    ///      the author's address. Cooldown and BackToBlack protection apply to the author, not msg.sender.
    ///      The typed data structure follows: SetPixel(address author,int256 x,int256 y,uint8 colorIndex,uint256 deadline)
    function setPixelWithSignature(
        address author,
        int256 x,
        int256 y,
        uint8 colorIndex,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        if (block.timestamp > deadline) revert SignatureExpired();
        if (!isValidCoord(x, y)) revert CoordinatesOutOfBounds();
        if (colorIndex >= 4) revert InvalidColorIndex();

        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(SETPIXEL_TYPEHASH, author, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address recoveredAddress = ecrecover(digest, v, r, s);

        if (recoveredAddress != author || recoveredAddress == address(0)) {
            revert InvalidSignature();
        }

        // Check cooldown for author (not msg.sender)
        if (lastPixelTime[author] != 0) {
            if (block.timestamp < lastPixelTime[author] + COOLDOWN_PERIOD) {
                revert CooldownNotElapsed();
            }
        }

        bytes32 key = coordToKey(x, y);
        uint8 previousColor = grid[key];

        if (colorIndex == 0 && previousColor != 0) {
            bool wasExpandable = shouldExpandGrid();
            if (wasExpandable) {
                // casting to 'uint256' is safe because max is positive (enforced in constructor)
                // and max * 2 + 1 will always fit in uint256
                // forge-lint: disable-next-line(unsafe-typecast)
                uint256 totalPixels = uint256(max * 2 + 1) * uint256(max * 2 + 1);
                uint256 nonZeroCount = 0;

                for (int256 checkY = -max; checkY <= max; checkY++) {
                    for (int256 checkX = -max; checkX <= max; checkX++) {
                        bytes32 checkKey = coordToKey(checkX, checkY);
                        if (grid[checkKey] != 0 && checkKey != key) {
                            nonZeroCount++;
                        }
                    }
                }

                bool wouldBeExpandable = nonZeroCount * 100 >= totalPixels * 80;
                if (!wouldBeExpandable) revert BackToBlack();
            }
        }

        grid[key] = colorIndex;
        pixelAuthors[key] = author;
        lastPixelTime[author] = block.timestamp;
        pixelCount[author]++;

        emit PixelSet(author, x, y, colorIndex, previousColor);

        if (previousColor != 0 && colorIndex != 0) {
            emit PixelOverwritten(author, x, y, colorIndex, previousColor);
        } else if (previousColor != 0 && colorIndex == 0) {
            emit PixelCleared(author, x, y, previousColor);
        }
    }

    /// @notice Determines if the grid has reached the 80% fill threshold for expansion
    /// @return True if 80% or more of the grid pixels are non-black (colorIndex > 0)
    /// @dev Iterates through all grid positions to count non-zero pixels. This is an expensive operation
    ///      for large grids. The 80% threshold is calculated as: (nonZeroPixels * 100) >= (totalPixels * 80)
    function shouldExpandGrid() public view returns (bool) {
        // casting to 'uint256' is safe because max is positive (enforced in constructor)
        // and max * 2 + 1 will always fit in uint256
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 totalPixels = uint256(max * 2 + 1) * uint256(max * 2 + 1);
        uint256 nonZeroCount = 0;

        for (int256 y = -max; y <= max; y++) {
            for (int256 x = -max; x <= max; x++) {
                bytes32 key = coordToKey(x, y);
                if (grid[key] != 0) {
                    nonZeroCount++;
                }
            }
        }

        return nonZeroCount * 100 >= totalPixels * 80;
    }

    /// @notice Expands the grid by one unit in all directions if the 80% fill threshold is met
    /// @dev Increases max by 1, expanding the valid coordinate range from [-max, max] to [-(max+1), (max+1)]
    ///      This function can be called by anyone and will only expand if shouldExpandGrid() returns true
    function expandGrid() public {
        if (shouldExpandGrid()) {
            max = max + 1;
            emit GridExpanded(max);
        }
    }

    /// @notice Retrieves the color index of a pixel at the specified coordinates
    /// @param x X coordinate of the pixel
    /// @param y Y coordinate of the pixel
    /// @return Color index (0-3) at the given coordinates, 0 if never set
    function getPixel(int256 x, int256 y) public view returns (uint8) {
        if (!isValidCoord(x, y)) revert CoordinatesOutOfBounds();

        bytes32 key = coordToKey(x, y);
        return grid[key];
    }

    /// @notice Retrieves the address of the author who last set a pixel at the specified coordinates
    /// @param x X coordinate of the pixel
    /// @param y Y coordinate of the pixel
    /// @return Address of the author who last modified the pixel, address(0) if never set
    function getPixelAuthor(int256 x, int256 y) public view returns (address) {
        if (!isValidCoord(x, y)) revert CoordinatesOutOfBounds();

        bytes32 key = coordToKey(x, y);
        return pixelAuthors[key];
    }

    /// @notice Checks whether a user is currently allowed to place a pixel
    /// @param user Address to check cooldown status for
    /// @return True if the user has never placed a pixel or their cooldown period has elapsed
    function canSetPixel(address user) public view returns (bool) {
        if (lastPixelTime[user] == 0) {
            return true;
        }
        return block.timestamp >= lastPixelTime[user] + COOLDOWN_PERIOD;
    }

    /// @notice Calculates the remaining cooldown time in seconds for a user
    /// @param user Address to check cooldown status for
    /// @return Number of seconds until the user can place another pixel, 0 if ready now
    function getRemainingCooldown(address user) public view returns (uint256) {
        if (lastPixelTime[user] == 0) {
            return 0;
        }
        uint256 nextAvailableTime = lastPixelTime[user] + COOLDOWN_PERIOD;
        if (block.timestamp >= nextAvailableTime) {
            return 0;
        }
        return nextAvailableTime - block.timestamp;
    }

    /// @notice Retrieves the total number of pixels an author has placed throughout the canvas lifetime
    /// @param author Address to query
    /// @return Total count of pixel placements by this author, including overwrites
    function getPixelCount(address author) public view returns (uint256) {
        return pixelCount[author];
    }

    /// @notice Retrieves the entire grid as a 2D array of color indices
    /// @return 2D array where each element is a color index (0-3), organized as rows from top to bottom
    /// @dev This is an expensive operation for large grids. Array dimensions are (max*2+1) x (max*2+1).
    ///      The first index is the row (y-axis from max to -max), second index is column (x-axis from -max to max)
    function getAllPixels() public view returns (uint8[][] memory) {
        // casting to 'uint256' is safe because max is positive (enforced in constructor)
        // and max * 2 + 1 will always fit in uint256
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 size = uint256(max * 2 + 1);
        uint8[][] memory pixels = new uint8[][](size);

        uint256 rowIndex = 0;
        for (int256 y = max; y >= -max; y--) {
            pixels[rowIndex] = new uint8[](size);
            uint256 colIndex = 0;
            for (int256 x = -max; x <= max; x++) {
                bytes32 key = coordToKey(x, y);
                pixels[rowIndex][colIndex] = grid[key];
                colIndex++;
            }
            rowIndex++;
        }

        return pixels;
    }

    /// @notice Converts a signed integer to its string representation
    /// @param value Integer value to convert (can be positive, negative, or zero)
    /// @return String representation of the integer, including '-' prefix for negative values
    /// @dev Internal helper function used by getAllPixelsWithCoords for coordinate serialization
    function intToString(int256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        bool negative = value < 0;
        uint256 absValue = uint256(negative ? -value : value);

        uint256 length = 0;
        uint256 temp = absValue;
        while (temp != 0) {
            length++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(negative ? length + 1 : length);
        uint256 index = buffer.length;

        temp = absValue;
        while (temp != 0) {
            index--;
            // casting to 'uint8' is safe because (temp % 10) is always 0-9,
            // and 48 + (0-9) = 48-57 which fits in uint8
            // forge-lint: disable-next-line(unsafe-typecast)
            buffer[index] = bytes1(uint8(48 + temp % 10));
            temp /= 10;
        }

        if (negative) {
            buffer[0] = "-";
        }

        return string(buffer);
    }

    /// @notice Retrieves all pixels with their coordinates and hex color values as formatted strings
    /// @return Array of strings where each element is formatted as "x,y,#hexcolor" (e.g., "5,-3,#8c1c84")
    /// @dev This is an expensive operation for large grids. Returns all positions including black pixels.
    ///      Array size is (max*2+1)^2. Useful for exporting the entire canvas state.
    function getAllPixelsWithCoords() public view returns (string[] memory) {
        // casting to 'uint256' is safe because max is positive (enforced in constructor)
        // and max * 2 + 1 will always fit in uint256
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 size = uint256(max * 2 + 1);
        uint256 totalPixels = size * size;
        string[] memory result = new string[](totalPixels);

        uint256 index = 0;
        for (int256 y = max; y >= -max; y--) {
            for (int256 x = -max; x <= max; x++) {
                bytes32 key = coordToKey(x, y);
                uint8 colorIndex = grid[key];

                result[index] = string(abi.encodePacked(
                    intToString(x),
                    ",",
                    intToString(y),
                    ",",
                    colors[colorIndex]
                ));
                index++;
            }
        }

        return result;
    }
}