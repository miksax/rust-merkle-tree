# Merkle Tree Library

## Overview

This project aims to develop a high-performance, secure Merkle tree library in Rust that can be seamlessly integrated
with both Rust and Node.js applications.
The library will utilize SHA-256 for hashing and will address common vulnerabilities associated with Merkle trees to
ensure robust state proof validations and other related functionalities.

## Table of Contents

- [Project Overview](#project-overview)
- [Task Description](#task-description)
- [Requirements](#requirements)
- [References](#references)
- [Getting Started](#getting-started)
- [Usage](#usage)

## Task Description

Your primary task is to create a Rust-based Merkle tree library with the following specifications:

1. **Hash Function**: Implement SHA-256 as the hashing algorithm for the Merkle trees.
2. **Security**: Ensure the library is secure against known Merkle tree exploits. This includes preventing
   vulnerabilities such as hash collision attacks, tree structure manipulation, and other related threats.
3. **Performance**: Optimize the library for speed and efficiency. The current solution using `merkle-tree-sha256` is
   slow and limited in functionality; your implementation should significantly improve upon these aspects.
4. **Cross-Language Support**: The library should be usable in both Rust and Node.js environments. This may involve
   creating appropriate bindings or interfaces for Node.js integration.
5. **Compatibility**: Maintain compatibility with existing systems that utilize Merkle trees for state proof validations
   and other applications.

## Requirements

To successfully complete this task, ensure that your implementation meets the following criteria:

- **Use of SHA-256**: All hashing within the Merkle trees must utilize the SHA-256 algorithm.
- **Security Measures**: Implement safeguards against known Merkle tree vulnerabilities. Conduct thorough testing to
  validate the security of the library.
- **Performance Optimization**: The library should demonstrate improved speed and functionality over the
  current `merkle-tree-sha256` package.
- **Node.js Integration**: Provide a way to use the library within Node.js applications.
- **Documentation**: Create comprehensive documentation detailing the library's usage, integration steps, and security
  features.
- **Testing**: Develop a suite of tests to ensure the library functions correctly and securely under various scenarios.

## References

- **Rust Merkle Tree Library**: [rs-merkle](https://github.com/antouhou/rs-merkle)
- **Current SHA-256 Merkle Tree Package**: [merkle-tree-sha256](https://github.com/btc-vision/merkle-tree-sha256)
- **Node.js Implementation**: [napi](https://napi.rs/)

Check the example folder for an example of the merkle-tree-sha256 package that we are currently using.

## Usage

To build run the following command:

```bash
npm run build
```

### Rust

Provide instructions and examples on how to use the library within Rust projects once developed.

### Node.js

Explain how to integrate and use the library within Node.js applications.
