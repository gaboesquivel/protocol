[![CircleCI](https://img.shields.io/circleci/project/github/RedSparr0w/node-csgo-parser.svg)](https://circleci.com/gh/livepeer/protocol/tree/master)
[![Gitter](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/livepeer/Lobby)

# Livepeer Protocol

The Livepeer Protocol consists of the on-chain smart contracts that govern the logic of:

* Livepeer Token ownership
* Transcoding requests and job assignment
* Proof and verification of transcoding work
* Bonding and delegating for transcoder election
* Slashing (penalties) for faulty participation

The protocol is defined in the [Livepeer Whitepaper](http://github.com/livepeer/wiki/blob/master/WHITEPAPER.md).

This is a work in progress LivepeerProtocol implementation. See the [Dev Roadmap](https://github.com/livepeer/protocol/blob/master/DEVROADMAP.md) for the plan to get from here to live protocol.

## Development

The Livepeer Protocol uses Truffle v4.0.1 and TestRPC v6.0.1.

```
git clone https://github.com/livepeer/protocol.git
cd protocol
npm install
```

To run the full test suite using docker-compose:

```
bash run_tests.sh
```

To build and test the Livepeer Protocol locally:

```
# Start testrpc
npm run testrpc

# Run the tests in another console window
npm run lint
npm run unit-test
npm run integration-test
```

Tests involving verification via Oraclize require [ethereum-bridge](https://github.com/oraclize/ethereum-bridge)

```
# Start testrpc
npm run test

# Start ethereum-bridge in another console window
git clone https://github.com/oraclize/ethereum-bridge.git
cd ethereum-bridge
npm install
node bridge -H localhost:8545 -a 9 --dev --disable-price

# Run tests in another console window
cd protocol
truffle test verification_test/**
```

To make changes to the Oraclize computation archive you need to fetch the relevant binaries first

```
cd verification_computation_archive
bash fetch_binaries.sh
# Make relevant changes
zip -r archive.zip .
# Add archive.zip to IPFS and change the computation archive IPFS hash in relevant test files
```

All contributions and bug fixes are welcome as pull requests back into the repo.

Built using [OpenZeppelin](https://github.com/OpenZeppelin/zeppelin-solidity) and [Truffle](http://truffle.readthedocs.io).

## Bugs

Please report protocol bugs big and small by [opening an issue](https://github.com/livepeer/protocol/issues/new). No possible bug report is too small.
