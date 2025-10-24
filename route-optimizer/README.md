# Route Optimizer

This project is a Node.js and Express web application designed to optimize routes and provide additional resources through a user-friendly interface.

## Project Structure

- **hackfest25.js**: Main entry point of the application, setting up the Express server, middleware, and routes for user authentication and route optimization.
- **public/**: Contains static files served by the application.
  - **css/**: Stylesheets for the application.
    - **main.css**: Main styles for the application.
    - **hackfest2.css**: Styles specific to the hackfest2.html page.
  - **js/**: JavaScript files for the application.
    - **main.js**: Main JavaScript functionality for the application.
    - **hackfest2.js**: JavaScript functionality specific to the hackfest2.html page.
  - **hackfest2.html**: HTML page accessible through the slide-out menu.
- **views/**: Contains HTML templates for the application.
  - **index.html**: Main HTML template for the application.
  - **partials/**: Contains reusable HTML components.
    - **header.html**: Header template used in the main HTML file.
    - **menu.html**: Slide-out menu template.
- **routes/**: Contains route definitions for the application.
  - **index.js**: Defines the routes, including the route for serving hackfest2.html.
- **package.json**: Project metadata, dependencies, and scripts for running the application.
- **README.md**: Documentation and instructions for the project.

## Features

- Smooth transitions for the slide-out menu.
- Access to hackfest2 resources through a dedicated menu item.
- Modular structure for easy maintenance and scalability.

## Installation

1. Clone the repository.
2. Navigate to the project directory.
3. Run `npm install` to install the dependencies.

## Usage

To start the application, run:

```
npm start
```

Visit `http://localhost:3000` in your browser to access the application. Use the slide-out menu to navigate to the hackfest2 resources.