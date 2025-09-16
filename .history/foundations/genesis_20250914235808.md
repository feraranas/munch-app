****Fer****

I need help with a PRD (Product Requirement Design) document to establish the foundation of the requirements of a web-application I'm building.

I'll guide you through what I have written, problematics, use cases.

1. A group of customers enter a restaurant, sit down.
2. Customers get handed a menu or Customers could scan a QR to see the menu on their phones.
3. Customers get approached by a waitress.
4. Waitress takes the order, by writing the order in a piece of paper.
5. Waitress heads to the kitchen and notifies the bartender and/or chef of the order.
6. Chef begins preparing food, and will notify the waitress when the foot is ready.
7. Step 3. to 6. repeats on demand.
8. Customers ask for the check.
9. The waitress heads back and enters the order in a computer-interface, which prints the receipt.
9.1 Waitress inputs dish, quantity, system retrieves price and calculates cost.
9.2 System prints the check/invoice.
9.3 Waitress heads to the customers and hands the invoice.
10. Waitress asks customers their method of payment (cash, cashless, debit card).
11. Customers have to sort the check by finding out who ordered what.
11.1 Customer A -> manually inspects the check -> determines they own $50
11.2 Customer B -> manually inspects the check -> determines they own $150
11.3 Customer C -> manually inspects the check -> determines they own $75
12. They pay independently.

The app I want to build comes in at step 9 through 11. At step 9 when the Waitress enters information at the POS (Point of Sale) system interface, this will update the QR the customers have already in front of them.

The waitress indicated the customers to scan the QR with their phones. Each customer will open a session in their phones where they can see the check. This is, the dishes ordered, the amount, the price, the total.

Customers will participate in a live room where they can see the number of people who is viewing the check.

A customer will click on the dish they ordered, and see a sum total (amount they have to pay). When a customer selects a dish, anyone else in the chat will see this row disabled (locked) to handle / avoid duplicate payments. 

A customer can decide the amount of tip on the sum total.

A customer will proceed to pay via a connected bank account. 

The waitress will receive a push notification after the amount has been payed in total.

The waitress can open the check on her phone.

After the check has been payed in full, the QR will reset to be allowed to be used again.

The order will be stored with a unique id, date, total, the complete order, the waitress id.

****AI (Chatgpt-5) ***

Perfect — you’ve already described the as-is flow and where your application fits in (step 9–11). To turn this into a Product Requirement Document (PRD), we want to clearly frame:

> Problem Statement (why you’re building this)
> Objectives & Goals (what success looks like)
> Users & Roles
> Scope (what’s in/out for v1)
> Use Cases / User Stories
> Functional Requirements
> Non-Functional Requirements
> Success Metrics

Here’s a draft PRD foundation for your app based on your description:

[prd con chatgpt5](prd-gpt5.md)

****AI (Claude) ***

[prd con claude](prd-claude.md)