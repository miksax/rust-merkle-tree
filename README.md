# Merkle Tree Library

![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=for-the-badge&logo=rust&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node%20js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)

![SHA-256](https://img.shields.io/badge/SHA--256-cryptographic-blue)

**Package**: `@btc-vision/rust-merkle-tree`

## Overview

This project aims to develop a high-performance, secure Merkle tree library in Rust, with seamless integration for both
Rust and Node.js applications. The library leverages SHA-256 as its cryptographic hash function and is designed to be
secure against known vulnerabilities, ensuring robust state proof validations. Optimized for both performance and
security, this library is intended for use in applications that require strong data integrity and validation mechanisms.

## Key Features

- **SHA-256 Hashing**: Utilizes the SHA-256 hashing algorithm to ensure cryptographic security.
- **Cross-Platform**: Designed for both Rust and Node.js environments, providing bindings for easy integration.
- **Secure Against Exploits**: Implements protections against known vulnerabilities like hash collisions and tree
  manipulation.
- **Optimized Performance**: Significantly improved speed and efficiency compared to existing Merkle tree
  implementations like `merkle-tree-sha256`.
- **Comprehensive Testing**: Includes a suite of tests to ensure the library performs securely and accurately.

## Table of Contents

- [Project Overview](#overview)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Usage](#usage)
    - [Rust Usage](#rust-usage)
    - [Node.js Usage](#nodejs-usage)
- [Task Description](#task-description)
- [Installation](#installation)
- [References](#references)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- **Rust**: Ensure you have Rust installed. The recommended version is stable 1.56+.
- **Node.js**: Version 16 or higher is required.
- **napi-rs**: Used to interface the Rust code with Node.js.

### Installation

1. **Clone the repository**:

   ```bash
   git clone git://github.com/btc-vision/rust-merkle-tree.git
   cd rust-merkle-tree
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the project**:

   For production build:

   ```bash
   npm run build
   ```

   For debug build:

   ```bash
   npm run build:debug
   ```

4. **Run tests**:

   ```bash
   npm test
   ```

## Usage

### Node.js Usage

For Node.js integration, the library provides bindings via N-API.

1. Install the package:

   ```bash
   npm install @btc-vision/rust-merkle-tree
   ```

2. Example of creating a Merkle tree:

   ```typescript
   import { MerkleTree } from '@btc-vision/rust-merkle-tree';

   const leaves: Uint8Array[] = [
       Uint8Array.from([100, 97, 116, 97, 49]),
       Uint8Array.from([100, 97, 116, 97, 50]),
       Uint8Array.from([100, 97, 116, 97, 51]),
   ];
   const tree = new MerkleTree(leaves);
   console.log('Merkle Root:', tree.root());
   ```

## Task Description

The primary task for this library involves developing a Rust-based Merkle tree that is secure, high-performing, and
compatible with both Rust and Node.js environments. Below are the core tasks:

1. **Hash Function**: Implement SHA-256 as the hash function.
2. **Security**: Safeguard against known Merkle tree exploits (e.g., hash collisions, tree manipulation).
3. **Performance**: Optimize performance for both Rust and Node.js implementations.
4. **Cross-Language Support**: Provide integration with Node.js through N-API bindings.
5. **Compatibility**: Ensure backward compatibility with existing systems using Merkle trees for state proof
   validations.

## References

- **Current Rust Merkle Tree Implementation**: [rs-merkle](https://github.com/antouhou/rs-merkle)
- **SHA-256 Merkle Tree for Node.js**: [merkle-tree-sha256](https://github.com/btc-vision/merkle-tree-sha256)
- **N-API for Rust Integration**: [napi.rs](https://napi.rs/)

Check the `example/` folder for usage examples and to compare performance with the current `merkle-tree-sha256` package.

## Contributing

Contributions are welcome! Please adhere to the code of conduct and sign all commits. Open an issue or submit a pull
request if you encounter any problems or have suggestions for improving the library.

## License

This project is licensed under the MIT License. For more details, please see the [LICENSE](LICENSE) file.
