# Contracts

- [Contracts](#contracts)
  - [Overview](#overview)
  - [Core Contracts](#core-contracts)
    - [SmartAccount](#smartaccount)
    - [Student](#student)
    - [University](#university)
    - [StudentsRegister](#studentsregister)
    - [Paymaster](#paymaster)
  - [Factory Contracts](#factory-contracts)
    - [StudentDeployer](#studentdeployer)
    - [UniversityDeployer](#universitydeployer)
  - [Supporting Contracts](#supporting-contracts)
    - [dependencies](#dependencies)

## Overview

This folder contains the smart contracts that form the blockchain foundation of the EduWallet system. These contracts implement the core functionality for universities to issue and students to manage academic records.

## Core Contracts

### [SmartAccount](SmartAccount.sol)

Base contract that implements the ERC-4337 account abstraction pattern. Serves as the foundation for both university and student wallets, enabling gas-less transactions and signature-based authorization.

### [Student](Student.sol)

Represents a student's academic wallet. Stores personal information and academic records (courses, grades, and certificates). Includes role-based access control for universities to read or write academic data.

### [University](University.sol)

Represents a university entity in the system. Stores basic university information and inherits account abstraction functionality from `SmartAccount`.

### [StudentsRegister](StudentsRegister.sol)

Central registry contract that manages student and university registrations. Acts as the entry point for new users and maintains mappings between user addresses and their smart contract wallets.

### [Paymaster](Paymaster.sol)

Implements a simple paymaster that sponsors gas fees for user operations, enabling gas-less transactions for students and universities.

## Factory Contracts

### [StudentDeployer](StudentDeployer.sol)

Factory contract for deploying new `Student` contracts with proper initialization.

### [UniversityDeployer](UniversityDeployer.sol)

Factory contract for deploying new `University` contracts with proper initialization.

## Supporting Contracts

### [dependencies](dependencies.sol)

Imports external dependencies from Account Abstraction and OpenZeppelin libraries to ensure TypeChain generates the necessary factories and ABIs.
