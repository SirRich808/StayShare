CONTEXT


You are tasked with generating a React-based web application that allows users to compare rental properties from various websites by pasting listing URLs. The app should be user-friendly, visually appealing, and functional, with a focus on cost comparison for group travel or shared accommodations. The free version of the app will limit users to comparing up to 5 properties at a time, and the app should handle date parsing from URLs for different rental platforms. The design should follow Apple's best practices for web/app development and be inspired by the modern, clean aesthetic of capital.xyz.

Key Features to Include
Property Input: Users paste the URL of a rental listing and enter the total price for their stay.
Metadata Fetching: The app fetches the property title and image from a server-side API endpoint (/api/metadata).
Date Parsing: The app detects the rental platform from the URL and parses reservation dates (check-in and check-out) from the URL query parameters, using platform-specific parameter names.
Guest Input: Users specify the number of guests, and the app calculates the cost per person and per day per person.
Comparison Table: Properties are displayed in a sortable table (default: lowest to highest total price), with columns for property name, platform, image, total price, price per person, and price per day per person.
Free Version Limit: Users can add up to 5 properties in the free version, with a message prompting them to upgrade if they try to add more.
Interactivity: Users can edit or remove properties, and the app dynamically updates cost calculations.
Data Persistence: The app uses local storage to save properties and guest count across page reloads.
Design: The app should have a clean, minimalistic design with a light theme, blue accents, and a responsive layout, inspired by capital.xyz.