// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.29 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {XiangsuZhongchuang} from "../src/XiangsuZhongchuang.sol";

contract DeployXiangsuZhongchuang is Script {
    function run() external {
        uint256 deployerPrivateKey;

        // Try to get private key from .env, use Anvil's first account as fallback
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // Default Anvil first account private key
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            console.log("No PRIVATE_KEY found in .env, using default Anvil first account private key");
        }

        vm.startBroadcast(deployerPrivateKey);

        // Deploy XiangsuZhongchuang with initial grid size of 8
        XiangsuZhongchuang xszc = new XiangsuZhongchuang(8);

        console.log("XiangsuZhongchuang contract deployed at:", address(xszc));
        console.log("Grid size: (-8, -8) to (8, 8)");

        vm.stopBroadcast();
    }
}
