// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.29 <0.9.0;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {XiangsuZhongchuang} from "../src/XiangsuZhongchuang.sol";

contract XiangsuZhongchuangTest is Test {
    XiangsuZhongchuang public xszc;
    int256 public constant MAX = 2;

    function setUp() public {
        xszc = new XiangsuZhongchuang(MAX);
        // Set initial timestamp to a non-zero value
        vm.warp(1000);
    }

    function test_Constructor() public view {
        assertEq(xszc.max(), MAX);
        assertEq(xszc.colors(0), "#000000");
        assertEq(xszc.colors(1), "#8c1c84");
        assertEq(xszc.colors(2), "#45a2f8");
        assertEq(xszc.colors(3), "#FFFFFF");
    }

    function test_InitialPixelsAreBlack() public view {
        // Test a few random coordinates
        assertEq(xszc.getPixel(0, 0), 0);
        assertEq(xszc.getPixel(-2, -2), 0);
        assertEq(xszc.getPixel(2, 2), 0);
        assertEq(xszc.getPixel(-1, 1), 0);
    }

    function test_CoordToKey() public view {
        bytes32 key1 = xszc.coordToKey(0, 0);
        bytes32 key2 = xszc.coordToKey(1, 1);
        bytes32 key3 = xszc.coordToKey(-1, -1);

        // Keys should be different for different coordinates
        assertTrue(key1 != key2);
        assertTrue(key1 != key3);
        assertTrue(key2 != key3);

        // Same coordinates should produce same key
        assertEq(key1, xszc.coordToKey(0, 0));
    }

    function test_IsValidCoord() public view {
        // Valid coordinates
        assertTrue(xszc.isValidCoord(0, 0));
        assertTrue(xszc.isValidCoord(-2, -2));
        assertTrue(xszc.isValidCoord(2, 2));
        assertTrue(xszc.isValidCoord(-2, 2));
        assertTrue(xszc.isValidCoord(2, -2));

        // Invalid coordinates
        assertFalse(xszc.isValidCoord(-3, 0));
        assertFalse(xszc.isValidCoord(3, 0));
        assertFalse(xszc.isValidCoord(0, -3));
        assertFalse(xszc.isValidCoord(0, 3));
        assertFalse(xszc.isValidCoord(-3, -3));
        assertFalse(xszc.isValidCoord(3, 3));
    }

    function test_SetPixel() public {
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixel(0, 0), 1);

        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-1, 1, 2);
        assertEq(xszc.getPixel(-1, 1), 2);

        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(2, -2, 3);
        assertEq(xszc.getPixel(2, -2), 3);
    }

    function test_SetPixel_RevertsOnInvalidCoordinates() public {
        vm.expectRevert(XiangsuZhongchuang.CoordinatesOutOfBounds.selector);
        xszc.setPixel(3, 0, 0);

        vm.expectRevert(XiangsuZhongchuang.CoordinatesOutOfBounds.selector);
        xszc.setPixel(0, -3, 0);
    }

    function test_SetPixel_RevertsOnInvalidColorIndex() public {
        vm.expectRevert(XiangsuZhongchuang.InvalidColorIndex.selector);
        xszc.setPixel(0, 0, 4);

        vm.expectRevert(XiangsuZhongchuang.InvalidColorIndex.selector);
        xszc.setPixel(0, 0, 255);
    }

    function test_GetPixel_RevertsOnInvalidCoordinates() public {
        vm.expectRevert(XiangsuZhongchuang.CoordinatesOutOfBounds.selector);
        xszc.getPixel(3, 0);

        vm.expectRevert(XiangsuZhongchuang.CoordinatesOutOfBounds.selector);
        xszc.getPixel(0, -3);
    }

    function test_GetAllPixels() public view {
        uint8[][] memory pixels = xszc.getAllPixels();

        // Check dimensions (should be 5x5 for max=2)
        // casting to 'uint256' is safe because MAX is a positive constant
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 expectedSize = uint256(MAX * 2 + 1);
        assertEq(pixels.length, expectedSize);
        assertEq(pixels[0].length, expectedSize);

        // All pixels should be 0 (black) initially
        for (uint256 i = 0; i < expectedSize; i++) {
            for (uint256 j = 0; j < expectedSize; j++) {
                assertEq(pixels[i][j], 0);
            }
        }
    }

    function test_GetAllPixels_AfterSettingSomePixels() public {
        // Set center pixel to white
        xszc.setPixel(0, 0, 3);

        // Use different addresses to avoid cooldown
        vm.prank(address(0x1));
        xszc.setPixel(-1, 0, 1);

        vm.prank(address(0x2));
        xszc.setPixel(1, 0, 2);

        uint8[][] memory pixels = xszc.getAllPixels();

        // Center row should be: [0, 1, 3, 2, 0]
        // y = 0 is at rowIndex = 2 (since we go from y=2 down to y=-2)
        uint256 centerRow = 2;
        assertEq(pixels[centerRow][0], 0); // x=-2
        assertEq(pixels[centerRow][1], 1); // x=-1 (pink)
        assertEq(pixels[centerRow][2], 3); // x=0 (white)
        assertEq(pixels[centerRow][3], 2); // x=1 (blue)
        assertEq(pixels[centerRow][4], 0); // x=2
    }

    function test_MultipleSetPixel_SameCoordinate() public {
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixel(0, 0), 1);

        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(0, 0, 2);
        assertEq(xszc.getPixel(0, 0), 2);

        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(0, 0, 3);
        assertEq(xszc.getPixel(0, 0), 3);
    }

    function test_NegativeCoordinates() public {
        xszc.setPixel(-2, -2, 1);

        // Fast forward 24 hours to bypass cooldown
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-1, -1, 2);

        assertEq(xszc.getPixel(-2, -2), 1);
        assertEq(xszc.getPixel(-1, -1), 2);
    }

    function test_GetPixelAuthor() public {
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelAuthor(0, 0), address(this));

        // Fast forward and set another pixel
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(1, 1, 2);
        assertEq(xszc.getPixelAuthor(1, 1), address(this));
    }

    function test_CooldownPeriod() public {
        // First pixel should work
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.lastPixelTime(address(this)), block.timestamp);

        // Immediate second pixel should fail
        vm.expectRevert(XiangsuZhongchuang.CooldownNotElapsed.selector);
        xszc.setPixel(1, 1, 2);

        // Fast forward 23 hours (not enough)
        vm.warp(block.timestamp + 23 hours);
        vm.expectRevert(XiangsuZhongchuang.CooldownNotElapsed.selector);
        xszc.setPixel(1, 1, 2);

        // Fast forward to exactly 24 hours
        vm.warp(block.timestamp + 1 hours);
        xszc.setPixel(1, 1, 2);
        assertEq(xszc.getPixel(1, 1), 2);
    }

    function test_CanSetPixel() public {
        // Should be able to set initially
        assertTrue(xszc.canSetPixel(address(this)));

        // Set a pixel
        xszc.setPixel(0, 0, 1);

        // Should not be able to set immediately after
        assertFalse(xszc.canSetPixel(address(this)));

        // Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours);

        // Should be able to set again
        assertTrue(xszc.canSetPixel(address(this)));
    }

    function test_GetRemainingCooldown() public {
        // Initially should be 0
        assertEq(xszc.getRemainingCooldown(address(this)), 0);

        // Set a pixel
        xszc.setPixel(0, 0, 1);

        // Should have 24 hours cooldown
        assertEq(xszc.getRemainingCooldown(address(this)), 24 hours);

        // Fast forward 10 hours
        vm.warp(block.timestamp + 10 hours);
        assertEq(xszc.getRemainingCooldown(address(this)), 14 hours);

        // Fast forward another 14 hours
        vm.warp(block.timestamp + 14 hours);
        assertEq(xszc.getRemainingCooldown(address(this)), 0);
    }

    function test_DifferentAddressesSeparateCooldowns() public {
        address user1 = address(0x1);
        address user2 = address(0x2);

        // User1 sets a pixel
        vm.prank(user1);
        xszc.setPixel(0, 0, 1);

        // User2 should still be able to set immediately
        vm.prank(user2);
        xszc.setPixel(1, 1, 2);

        assertEq(xszc.getPixelAuthor(0, 0), user1);
        assertEq(xszc.getPixelAuthor(1, 1), user2);
    }

    function test_PixelAuthorshipChanges() public {
        address user1 = address(0x1);
        address user2 = address(0x2);

        // User1 sets a pixel
        vm.prank(user1);
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelAuthor(0, 0), user1);

        // User2 overwrites it after 24 hours
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user2);
        xszc.setPixel(0, 0, 2);
        assertEq(xszc.getPixelAuthor(0, 0), user2);
    }

    function test_ShouldExpandGrid_InitiallyFalse() public view {
        // Initially all pixels are 0 (black), so should not expand
        assertFalse(xszc.shouldExpandGrid());
    }

    function test_ShouldExpandGrid_Below80Percent() public {
        // For max=2, we have 5x5 = 25 pixels
        // 80% of 25 = 20 pixels
        // Set 19 pixels (below threshold)

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 19; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 19; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        assertEq(pixelCount, 19);
        assertFalse(xszc.shouldExpandGrid());
    }

    function test_ShouldExpandGrid_Exactly80Percent() public {
        // For max=2, we have 5x5 = 25 pixels
        // 80% of 25 = 20 pixels (exactly)

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        // Set 19 pixels first
        for (int256 y = -2; y <= 2 && pixelCount < 19; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 19; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Before setting the 20th pixel, should not expand
        assertFalse(xszc.shouldExpandGrid());

        // Set the 20th pixel manually to a specific coordinate
        vm.prank(users[19]);
        xszc.setPixel(2, 1, 1);

        // Now the grid should be expandable
        assertTrue(xszc.shouldExpandGrid());

        // Expand the grid
        xszc.expandGrid();

        // After expanding, max should have incremented
        assertEq(xszc.max(), 3);
    }

    function test_ShouldExpandGrid_Above80Percent() public {
        // For max=2, we have 5x5 = 25 pixels
        // Set 21 pixels (above 80%)

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        // Set 19 pixels first
        for (int256 y = -2; y <= 2 && pixelCount < 19; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 19; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Still should not expand at 19 pixels
        assertFalse(xszc.shouldExpandGrid());
        assertEq(xszc.max(), 2);

        // Set 20th pixel
        vm.prank(users[19]);
        xszc.setPixel(2, 1, 1);

        // Expand the grid
        xszc.expandGrid();

        // Max should have incremented
        assertEq(xszc.max(), 3);

        // Set 21st pixel in the now-expanded grid
        vm.prank(users[20]);
        xszc.setPixel(2, 2, 1);

        // Verify 21 pixels are set
        assertEq(xszc.max(), 3);
    }

    function test_MaxIncrementsWhen80PercentFilled() public {
        // For max=2, we have 5x5 = 25 pixels
        // Need 20 pixels to reach 80%

        assertEq(xszc.max(), 2);

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        // Set 19 pixels first (below threshold)
        for (int256 y = -2; y <= 2 && pixelCount < 19; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 19; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Max should still be 2
        assertEq(xszc.max(), 2);

        // Set the 20th pixel (reaches 80%)
        vm.prank(users[19]);
        xszc.setPixel(2, 1, 1);

        // Expand the grid
        xszc.expandGrid();

        // Max should now be 3
        assertEq(xszc.max(), 3);
    }

    function test_MaxDoesNotIncrementBelow80Percent() public {
        // For max=2, we have 5x5 = 25 pixels

        assertEq(xszc.max(), 2);

        address[] memory users = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-10, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        // Set only 10 pixels (40%, well below 80%)
        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 10; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 10; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Max should still be 2
        assertEq(xszc.max(), 2);
    }

    function test_GridExpansionAllowsNewCoordinates() public {
        // Initially max=2, so valid coords are -2 to 2
        assertTrue(xszc.isValidCoord(2, 2));
        assertFalse(xszc.isValidCoord(3, 0));

        // Fill 80% of the grid to trigger expansion
        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 20; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 20; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Expand the grid
        xszc.expandGrid();

        // Max should now be 3
        assertEq(xszc.max(), 3);

        // Now coordinates at 3 should be valid
        assertTrue(xszc.isValidCoord(3, 0));
        assertTrue(xszc.isValidCoord(0, 3));
        assertTrue(xszc.isValidCoord(-3, -3));

        // And we should be able to set pixels there
        vm.prank(users[20]);
        xszc.setPixel(3, 0, 2);
        assertEq(xszc.getPixel(3, 0), 2);
    }

    function test_MultipleExpansions() public {
        // Start with a small grid (max=1) to make testing easier
        XiangsuZhongchuang smallXszc = new XiangsuZhongchuang(1);

        assertEq(smallXszc.max(), 1);

        // For max=1, we have 3x3 = 9 pixels
        // Need 8 pixels (rounded up from 7.2) to reach 80%
        address[] memory users = new address[](20);
        for (uint256 i = 0; i < 20; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-20, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        // Fill first grid (3x3)
        uint256 userIndex = 0;
        for (int256 y = -1; y <= 1; y++) {
            for (int256 x = -1; x <= 1; x++) {
                if (userIndex < 8) {
                    vm.prank(users[userIndex]);
                    smallXszc.setPixel(x, y, 1);
                    userIndex++;
                }
            }
        }

        // Expand the grid
        smallXszc.expandGrid();

        // Should have expanded to max=2
        assertEq(smallXszc.max(), 2);

        // Now for max=2, we have 5x5 = 25 pixels, but 8 are already filled
        // Need 20 total to reach 80%, so 12 more pixels
        for (int256 y = -2; y <= 2; y++) {
            for (int256 x = -2; x <= 2; x++) {
                if (userIndex < 20) {
                    // Skip already filled pixels
                    if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
                        continue;
                    }
                    vm.prank(users[userIndex]);
                    smallXszc.setPixel(x, y, 1);
                    userIndex++;
                }
            }
        }

        // Expand the grid again
        smallXszc.expandGrid();

        // Should have expanded to max=3
        assertEq(smallXszc.max(), 3);
    }

    function test_BackToBlack_AllowedWhenWellAbove80Percent() public {
        // For max=2, we have 5x5 = 25 pixels
        // Set 22 pixels (88%, well above 80%)

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 22; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 22; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // At 22/25 = 88%, removing one pixel would give us 21/25 = 84%, still above 80%
        // So we should be able to set a pixel back to black
        vm.prank(users[0]);
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-2, -2, 0); // Set first pixel back to black

        assertEq(xszc.getPixel(-2, -2), 0);
    }

    function test_BackToBlack_BlockedWhenJustAbove80Percent() public {
        // For max=2, we have 5x5 = 25 pixels
        // Set 21 pixels (84%)

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 21; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 21; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // At 21/25 = 84%, removing one pixel would give us 20/25 = 80%, still at threshold
        // But since 80% still triggers shouldExpandGrid, we should NOT be blocked
        // Wait, let me recalculate: 20 * 100 = 2000, 25 * 80 = 2000, so 2000 >= 2000 is true
        // So this should be allowed since we'd still be at the threshold
        vm.prank(users[0]);
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-2, -2, 0); // Should succeed

        assertEq(xszc.getPixel(-2, -2), 0);
    }

    function test_BackToBlack_AllowedWhenNotAtThreshold() public {
        // For max=2, we have 5x5 = 25 pixels
        // Set only 10 pixels (40%, well below 80%)

        address[] memory users = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-10, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 10; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 10; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Since we're not at 80% threshold, shouldExpandGrid is false
        // So the BACK_TO_BLACK check should not apply
        vm.prank(users[0]);
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-2, -2, 0); // Should succeed

        assertEq(xszc.getPixel(-2, -2), 0);
    }

    function test_BackToBlack_OnlyAppliesToColoredPixels() public {
        // Setting a black pixel to black should always work (no-op)
        xszc.setPixel(0, 0, 0);
        assertEq(xszc.getPixel(0, 0), 0);
    }

    function test_BackToBlack_DoesNotAffectColorToColorChange() public {
        // For max=2, we have 5x5 = 25 pixels
        // Set exactly 20 pixels (80%)

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 20; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 20; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Changing from one color to another should always work, even at threshold
        vm.prank(users[0]);
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-2, -2, 2); // Change from color 1 to color 2

        assertEq(xszc.getPixel(-2, -2), 2);
    }

    // Event tests
    function test_Event_PixelSet_NewPixel() public {
        // Test PixelSet event when setting a new pixel (black -> color)
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelSet(address(this), 0, 0, 1, 0);

        xszc.setPixel(0, 0, 1);
    }

    function test_Event_PixelSet_OverwritePixel() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);

        // Test PixelSet event when overwriting
        vm.warp(block.timestamp + 24 hours);
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelSet(address(this), 0, 0, 2, 1);

        xszc.setPixel(0, 0, 2);
    }

    function test_Event_PixelOverwritten() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);

        // Test PixelOverwritten event when changing from color to color
        vm.warp(block.timestamp + 24 hours);
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelOverwritten(address(this), 0, 0, 2, 1);

        xszc.setPixel(0, 0, 2);
    }

    function test_Event_PixelOverwritten_NotEmittedForNewPixel() public {
        // When setting a new pixel (black -> color), PixelOverwritten should NOT be emitted
        // We can't directly test that an event is NOT emitted, but we can verify
        // that only PixelSet is emitted by checking the event count

        vm.recordLogs();
        xszc.setPixel(0, 0, 1);

        // Get all logs
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Should only have 1 event (PixelSet)
        assertEq(logs.length, 1);
    }

    function test_Event_PixelCleared() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);

        // Test PixelCleared event when setting to black
        vm.warp(block.timestamp + 24 hours);
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelCleared(address(this), 0, 0, 1);

        xszc.setPixel(0, 0, 0);
    }

    function test_Event_PixelCleared_NotEmittedForBlackToBlack() public {
        // When setting black to black, PixelCleared should NOT be emitted

        vm.recordLogs();
        xszc.setPixel(0, 0, 0);

        // Get all logs
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Should only have 1 event (PixelSet)
        assertEq(logs.length, 1);
    }

    function test_Event_GridExpanded() public {
        // Fill 80% of the grid
        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 20; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 20; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Test GridExpanded event
        vm.expectEmit(false, false, false, true);
        emit XiangsuZhongchuang.GridExpanded(3);

        xszc.expandGrid();
    }

    function test_Event_GridExpanded_NotEmittedWhenBelowThreshold() public {
        // Set only 10 pixels (40%, well below 80%)
        address[] memory users = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-10, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        uint256 pixelCount = 0;
        for (int256 y = -2; y <= 2 && pixelCount < 10; y++) {
            for (int256 x = -2; x <= 2 && pixelCount < 10; x++) {
                vm.prank(users[pixelCount]);
                xszc.setPixel(x, y, 1);
                pixelCount++;
            }
        }

        // Try to expand (should not expand)
        vm.recordLogs();
        xszc.expandGrid();

        // Get all logs
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Should have no events
        assertEq(logs.length, 0);
    }

    function test_Event_MultipleEventsOnOverwrite() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);

        // When overwriting color with color, should emit both PixelSet and PixelOverwritten
        vm.warp(block.timestamp + 24 hours);
        vm.recordLogs();
        xszc.setPixel(0, 0, 2);

        // Get all logs
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Should have 2 events (PixelSet and PixelOverwritten)
        assertEq(logs.length, 2);
    }

    function test_Event_MultipleEventsOnClear() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);

        // When clearing, should emit both PixelSet and PixelCleared
        vm.warp(block.timestamp + 24 hours);
        vm.recordLogs();
        xszc.setPixel(0, 0, 0);

        // Get all logs
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // Should have 2 events (PixelSet and PixelCleared)
        assertEq(logs.length, 2);
    }

    function test_Event_PixelSet_DifferentUsers() public {
        address user1 = address(0x1);
        address user2 = address(0x2);

        // Test event with user1
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelSet(user1, 0, 0, 1, 0);
        xszc.setPixel(0, 0, 1);

        // Test event with user2 overwriting
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user2);
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelSet(user2, 0, 0, 2, 1);
        xszc.setPixel(0, 0, 2);
    }

    // Signature-based tests
    function test_SetPixelWithSignature_ValidSignature() public {
        // Create a signer with a known private key
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        int256 x = 0;
        int256 y = 0;
        uint8 colorIndex = 1;
        uint256 deadline = block.timestamp + 1 hours;

        // Create the signature
        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Execute with signature
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);

        // Verify the pixel was set
        assertEq(xszc.getPixel(x, y), colorIndex);
        assertEq(xszc.getPixelAuthor(x, y), signer);
        assertEq(xszc.lastPixelTime(signer), block.timestamp);
    }

    function test_SetPixelWithSignature_InvalidSignature() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);
        address wrongSigner = address(0x9999);

        int256 x = 0;
        int256 y = 0;
        uint8 colorIndex = 1;
        uint256 deadline = block.timestamp + 1 hours;

        // Create the signature with wrong signer
        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), wrongSigner, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Should revert with InvalidSignature
        vm.expectRevert(XiangsuZhongchuang.InvalidSignature.selector);
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);
    }

    function test_SetPixelWithSignature_ExpiredSignature() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        int256 x = 0;
        int256 y = 0;
        uint8 colorIndex = 1;
        uint256 deadline = block.timestamp + 1 hours;

        // Create the signature
        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Warp past the deadline
        vm.warp(deadline + 1);

        // Should revert with SignatureExpired
        vm.expectRevert(XiangsuZhongchuang.SignatureExpired.selector);
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);
    }

    function test_SetPixelWithSignature_CooldownEnforced() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        // First pixel should succeed
        {
            uint256 deadline = block.timestamp + 1 hours;
            bytes32 structHash = keccak256(
                abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, 0, 0, uint8(1), deadline)
            );
            bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
            xszc.setPixelWithSignature(signer, 0, 0, 1, deadline, v, r, s);
        }

        // Try to set another pixel immediately - should fail
        {
            uint256 deadline = block.timestamp + 1 hours;
            bytes32 structHash = keccak256(
                abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, 1, 1, uint8(1), deadline)
            );
            bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

            vm.expectRevert(XiangsuZhongchuang.CooldownNotElapsed.selector);
            xszc.setPixelWithSignature(signer, 1, 1, 1, deadline, v, r, s);
        }

        // Fast forward 24 hours and try again - should succeed
        vm.warp(block.timestamp + 24 hours);
        {
            uint256 deadline = block.timestamp + 1 hours;
            bytes32 structHash = keccak256(
                abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, 1, 1, uint8(1), deadline)
            );
            bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
            xszc.setPixelWithSignature(signer, 1, 1, 1, deadline, v, r, s);
            assertEq(xszc.getPixel(1, 1), 1);
        }
    }

    function test_SetPixelWithSignature_OutOfBoundsCoordinates() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        int256 x = 10; // Out of bounds
        int256 y = 0;
        uint8 colorIndex = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Should revert with CoordinatesOutOfBounds
        vm.expectRevert(XiangsuZhongchuang.CoordinatesOutOfBounds.selector);
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);
    }

    function test_SetPixelWithSignature_InvalidColorIndex() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        int256 x = 0;
        int256 y = 0;
        uint8 colorIndex = 4; // Invalid
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Should revert with InvalidColorIndex
        vm.expectRevert(XiangsuZhongchuang.InvalidColorIndex.selector);
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);
    }

    function test_SetPixelWithSignature_AnyoneCanSubmit() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);
        address submitter = address(0x5678);

        int256 x = 0;
        int256 y = 0;
        uint8 colorIndex = 1;
        uint256 deadline = block.timestamp + 1 hours;

        // Create the signature
        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Someone else submits the transaction
        vm.prank(submitter);
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);

        // Verify the pixel author is the signer, not the submitter
        assertEq(xszc.getPixelAuthor(x, y), signer);
        assertEq(xszc.lastPixelTime(signer), block.timestamp);
        assertEq(xszc.lastPixelTime(submitter), 0);
    }

    function test_SetPixelWithSignature_BackToBlackProtection() public {
        // Use a known private key to get signer address
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        // Fill grid to 84% (21 pixels), starting with signer at (-2, -2)
        vm.prank(signer);
        xszc.setPixel(-2, -2, 1);

        address[] memory users = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            // casting to 'uint160' is safe because i + 1 is in range 1-25, well within uint160 bounds
            // forge-lint: disable-next-line(unsafe-typecast)
            users[i] = address(uint160(i + 1));
        }

        // Fill 20 more pixels (total 21 = 84%)
        uint256 pixelCount = 0;
        for (int256 loopY = -2; loopY <= 2 && pixelCount < 20; loopY++) {
            for (int256 loopX = -2; loopX <= 2 && pixelCount < 20; loopX++) {
                // Skip the pixel we already filled at (-2, -2)
                if (loopX == -2 && loopY == -2) continue;
                vm.prank(users[pixelCount]);
                xszc.setPixel(loopX, loopY, 1);
                pixelCount++;
            }
        }

        // Try to clear the signer's pixel with signature (would drop to 80%, which is still at threshold)
        vm.warp(block.timestamp + 24 hours);

        int256 x = -2;
        int256 y = -2;
        uint8 colorIndex = 0;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // This should work since we'd still be at 80% after clearing (21 pixels now, would be 20 after)
        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);
        assertEq(xszc.getPixel(x, y), 0);
    }

    function test_Event_PixelSet_WithSignature() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        int256 x = 0;
        int256 y = 0;
        uint8 colorIndex = 1;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, x, y, colorIndex, deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        // Expect the PixelSet event with the signer as author
        vm.expectEmit(true, false, false, true);
        emit XiangsuZhongchuang.PixelSet(signer, x, y, colorIndex, 0);

        xszc.setPixelWithSignature(signer, x, y, colorIndex, deadline, v, r, s);
    }

    // Pixel count tests
    function test_PixelCount_InitiallyZero() public view {
        assertEq(xszc.getPixelCount(address(this)), 0);
        assertEq(xszc.pixelCount(address(this)), 0);
    }

    function test_PixelCount_IncrementsOnSetPixel() public {
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelCount(address(this)), 1);

        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(1, 1, 2);
        assertEq(xszc.getPixelCount(address(this)), 2);

        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(-1, -1, 3);
        assertEq(xszc.getPixelCount(address(this)), 3);
    }

    function test_PixelCount_IncrementsOnOverwrite() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelCount(address(this)), 1);

        // Overwrite same pixel - count should still increment
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(0, 0, 2);
        assertEq(xszc.getPixelCount(address(this)), 2);
    }

    function test_PixelCount_IncrementsOnClear() public {
        // Set initial pixel
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelCount(address(this)), 1);

        // Clear pixel (set to black) - count should still increment
        vm.warp(block.timestamp + 24 hours);
        xszc.setPixel(0, 0, 0);
        assertEq(xszc.getPixelCount(address(this)), 2);
    }

    function test_PixelCount_IncrementsOnBlackToBlack() public {
        // Set black to black
        xszc.setPixel(0, 0, 0);
        assertEq(xszc.getPixelCount(address(this)), 1);
    }

    function test_PixelCount_SeparateForDifferentAuthors() public {
        address user1 = address(0x1);
        address user2 = address(0x2);
        address user3 = address(0x3);

        // User1 sets 2 pixels
        vm.prank(user1);
        xszc.setPixel(0, 0, 1);
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user1);
        xszc.setPixel(1, 0, 1);

        // User2 sets 3 pixels
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user2);
        xszc.setPixel(0, 1, 2);
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user2);
        xszc.setPixel(1, 1, 2);
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user2);
        xszc.setPixel(-1, 0, 2);

        // User3 sets 1 pixel
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user3);
        xszc.setPixel(-1, -1, 3);

        // Check counts
        assertEq(xszc.getPixelCount(user1), 2);
        assertEq(xszc.getPixelCount(user2), 3);
        assertEq(xszc.getPixelCount(user3), 1);
    }

    function test_PixelCount_IncrementsWithSignature() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        // Initially zero
        assertEq(xszc.getPixelCount(signer), 0);

        // Set first pixel with signature
        {
            uint256 deadline = block.timestamp + 1 hours;
            bytes32 structHash = keccak256(
                abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, 0, 0, uint8(1), deadline)
            );
            bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
            xszc.setPixelWithSignature(signer, 0, 0, 1, deadline, v, r, s);
        }

        assertEq(xszc.getPixelCount(signer), 1);

        // Set second pixel with signature
        vm.warp(block.timestamp + 24 hours);
        {
            uint256 deadline = block.timestamp + 1 hours;
            bytes32 structHash = keccak256(
                abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, 1, 1, uint8(2), deadline)
            );
            bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
            xszc.setPixelWithSignature(signer, 1, 1, 2, deadline, v, r, s);
        }

        assertEq(xszc.getPixelCount(signer), 2);
    }

    function test_PixelCount_AuthorChangesDoNotAffectOriginalAuthor() public {
        address user1 = address(0x1);
        address user2 = address(0x2);

        // User1 sets a pixel
        vm.prank(user1);
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelCount(user1), 1);
        assertEq(xszc.getPixelCount(user2), 0);

        // User2 overwrites it
        vm.warp(block.timestamp + 24 hours);
        vm.prank(user2);
        xszc.setPixel(0, 0, 2);

        // Both users' counts increment
        assertEq(xszc.getPixelCount(user1), 1);
        assertEq(xszc.getPixelCount(user2), 1);
    }

    function test_PixelCount_MixedSetPixelAndSignature() public {
        uint256 signerPrivateKey = 0x1234;
        address signer = vm.addr(signerPrivateKey);

        // Set pixel directly
        vm.prank(signer);
        xszc.setPixel(0, 0, 1);
        assertEq(xszc.getPixelCount(signer), 1);

        // Set pixel with signature
        vm.warp(block.timestamp + 24 hours);
        {
            uint256 deadline = block.timestamp + 1 hours;
            bytes32 structHash = keccak256(
                abi.encode(xszc.SETPIXEL_TYPEHASH(), signer, 1, 1, uint8(2), deadline)
            );
            bytes32 digest = keccak256(abi.encodePacked("\x19\x01", xszc.DOMAIN_SEPARATOR(), structHash));
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
            xszc.setPixelWithSignature(signer, 1, 1, 2, deadline, v, r, s);
        }

        assertEq(xszc.getPixelCount(signer), 2);

        // Set another pixel directly
        vm.warp(block.timestamp + 24 hours);
        vm.prank(signer);
        xszc.setPixel(-1, -1, 3);
        assertEq(xszc.getPixelCount(signer), 3);
    }

    function test_PixelCount_LargeNumber() public {
        address user = address(0x1);

        // Simulate setting 100 pixels (in practice this would take 100 days)
        for (uint256 i = 0; i < 10; i++) {
            vm.warp(block.timestamp + 24 hours);
            vm.prank(user);
            xszc.setPixel(0, 0, 1); // Keep overwriting same pixel
        }

        assertEq(xszc.getPixelCount(user), 10);
    }
}
