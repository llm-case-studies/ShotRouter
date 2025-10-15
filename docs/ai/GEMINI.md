# Gemini Context: ShotRouter Project

## Directory Overview

This repository contains a complete design package for a desktop utility called **ShotRouter**. See the structured docs under `docs/` for the latest organization (UI-first, compliance-ready).

## Key Files

This project is organized into a series of Markdown files that detail every aspect of the ShotRouter application:

*   **WHITEPAPER.md**: Outlines the core concept, the problems it solves, high-level goals, and design principles.
*   **ARCHITECTURE.md**: Describes the system's components, algorithms (like the atomic claim for files), and data flow sequences. It specifies a single-daemon architecture with a local API.
*   **SPEC.md**: Contains the detailed product requirements, user stories, and functional/non-functional specifications.
*   **ROADMAP.md**: Lays out the development plan in phases, starting from the current design package (Phase 0) to a full-featured, cross-platform application.
*   **CONFIG.md**: Defines the configuration structure for both global and repository-specific settings, using the TOML format.
*   **API.md**: Specifies the contract for the local REST/WebSocket API (intended to be built with FastAPI) for UI and tooling integration.
*   **CLI.md**: Details the command-line interface, including verbs (`arm`, `list`, `route`) and user experience.
*   **DATA_MODEL.md**: Describes the SQLite database schema for the audit trail and other metadata.
*   **UI.md**: Contains wireframes and interaction design for the user-facing SPA (Single Page Application).
*   **SECURITY.md**: Addresses privacy, trust, and compliance considerations.
*   **OPERATIONS.md**: Plans for running ShotRouter as a service on different operating systems.
*   **INTEGRATIONS.md**: Discusses potential integrations with tools like VSCode and ActCLI.
*   **TESTING.md**: Outlines the test strategy.
*   **NAMING.md**: Defines the file and directory naming conventions.
*   **TODO.md**: A list of concrete tasks for implementation.

## Usage and Project Goals

The contents of this directory are intended to be used as a comprehensive blueprint for building the ShotRouter application. The development is planned in several phases:

1.  **MVP (Linux):** Build the core functionality, including the file watcher, router, and CLI.
2.  **API + UI:** Implement the FastAPI backend and a simple web-based UI.
3.  **Windows/macOS Support:** Extend the application to be cross-platform.
4.  **Polish and Compliance:** Add features like retention policies, search, and advanced routing rules.

When working on this project, refer to the relevant markdown files for guidance on architecture, features, and implementation details. The `TODO.md` file can be used to track progress.
