# XSZC Contracts

## Deploy to anvil

```bash
forge script script/DeployXiangsuZhongchuang.s.sol:DeployXiangsuZhongchuang --rpc-url http://127.0.0.1:8545 --broadcast

# or 

forge script script/DeployXiangsuZhongchuang.s.sol:DeployXiangsuZhongchuang --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Add 1 pixel

- 0 = black (#000000)
- 1 = purple (#8c1c84)
- 2 = blue (#45a2f8)
- 3 = white (#FFFFFF)

```bash
cast send <CONTRACT_ADDRESS> "setPixel(int256,int256,uint8)" 0 0 2 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545
```

## Forward 24 hours

```bash
cast rpc evm_increaseTime 86400
```

