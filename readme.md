# Event Management Backend API

Backend API for an event management platform built using Node.js, Express, TypeScript, and Prisma ORM.

This project is developed as a **group project**.  
This repository documents **my individual contribution (Feature 2)**.

---

## My Contribution (Feature 2 – Organizer & Transactions)

The following features are implemented by me:

## Organizer Module
- Organizer profile creation
- Organizer profile retrieval
- Organizer statistics (raw transaction data)
- Attendee list per event

## Ticket Module
- Ticket creation for organizer-owned events
- Ticket validation per organizer

## Transaction Module
- Create transaction (ticket purchase)
- Transaction status handling
- Accept transaction (seat confirmed)
- Reject transaction (seat restored)
- Automatic data restoration on rejection

All organizer actions are protected using **JWT authentication**.

---

## Tech Stack
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- MySQL / PostgreSQL
- JWT Authentication

---

## Installation

```bash
npm install
