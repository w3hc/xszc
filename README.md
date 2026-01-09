# 像素众创

_xiàngsù zhòngchuàng_

Xiangsu Zhongchuang (XSZC) is a Collective pixel artwork.

## Install

```bash
pnpm i
```

## Run

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Switch network

Use the network switcher to switch between OP Mainnet and Anvil local network (for testing):

```bash
# Switch to OP Mainnet
/switch-network mainnet

# Switch to Anvil local network
/switch-network anvil
```

It will update:

- Contract address in `src/config/contract.ts`
- RPC URL and Chain ID
- Relayer private key in `.env`

After switching networks, restart your dev server for changes to take effect.

### Manual Configuration

**OP Mainnet:**

- Contract: `0xFDBfA059ed1C7d32eCF2df6BB8b6C46A42a34ABa`
- RPC: `https://mainnet.optimism.io`
- Chain ID: `10`

**Anvil (Local):**

- Contract: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- RPC: `http://127.0.0.1:8545`
- Chain ID: `31337`

## License

GPL-3.0

## Contact

**Julien Béranger** ([GitHub](https://github.com/julienbrg))

- Element: [@julienbrg:matrix.org](https://matrix.to/#/@julienbrg:matrix.org)
- Farcaster: [julien-](https://warpcast.com/julien-)
- Telegram: [@julienbrg](https://t.me/julienbrg)

<img src="https://bafkreid5xwxz4bed67bxb2wjmwsec4uhlcjviwy7pkzwoyu5oesjd3sp64.ipfs.w3s.link" alt="built-with-ethereum-w3hc" width="100"/>
