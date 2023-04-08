//Import required packages
const express = require("express");
const { check, validationResult } = require("express-validator");
const fileUpload = require("express-fileupload");
const session = require("express-session");
let myApp = express();
myApp.use(express.urlencoded({ extended: false }));
myApp.use(fileUpload());
const path = require("path");
myApp.set("views", path.join(__dirname, "views"));
myApp.use(express.static(__dirname + "/public"));
myApp.set("view engine", "ejs");

// Configure Session
myApp.use(
  session({
    secret: "qwerty@123456789",
    resave: false,
    saveUninitialized: true,
  })
);

// Make Connection to mongoose
const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/ticketingDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const tickets = mongoose.model("tickets", {
  name: String,
  email: String,
  description: String,
  imageName: String,
});

myApp.get("/", (req, res) => {
  res.render("home");
  console.log("In Home !");
});

var nameRegex = /^[a-zA-Z0-9]$/;

myApp.post(
  "/process",
  [
    check("desc", "Description required").not().isEmpty(),
    check("email", "Email should be valid").isEmail(),
  ],
  function (req, res) {
    // check for errors
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.render("home", { er: errors.array() });
    } else {
      //fetch all the form fields
      var name = req.body.name; // the key here is from the name attribute not the id attribute
      var email = req.body.email;
      var description = req.body.desc;

      console.log("name : ", name);
      console.log("email : ", email);

      // fetch the file
      // get the name of the file
      var imageName = req.files.image.name;
      // get the actual file
      var imageFile = req.files.image; // this is a temporary file in buffer.

      // save the file
      // check if the file already exists or employ some logic that each filename is unique.
      var imagePath = "public/uploads/" + imageName;
      // move the temp file to a permanent location mentioned above
      imageFile.mv(imagePath, function (err) {
        console.log(err);
      });

      // create an object with the fetched data to send to the view
      var pageData = {
        name: name,
        email: email,
        description: description,
        imageName: imageName,
      };

      let myCard = new tickets(pageData);
      myCard.save();
      // send the data to the view and render it
      res.render("thankyou", pageData);
    }
  }
);

// ---   ADMIN User Code   -----------------------------------------------------------------

// Admin model for mongoose
const Administrator = mongoose.model("Administrator", {
  userId: String,
  password: String,
});

// Create admin account
myApp.get("/create-admin", function (req, res) {
  var adminInfo = {
    userId: "admin",
    password: "password",
  };
  let admin = new Administrator(adminInfo);
  admin.save();
  res.send("Admin user created!");
});

// Go to the login Form
myApp.get("/login", (req, res) => {
  res.render("login"); // will render views/login.ejs
});

myApp.get("/logout", (req, res) => {
  req.session.userId = ""; // remove the set userId
  req.session.loggedIn = false; // change loggedIn value to false
  res.redirect("/login");
});

// Get Admin dashboard
myApp.get("/admin-home", (req, res) => {
  if (req.session.loggedIn) {
    res.render("admin-dashboard");
  } else {
    res.redirect("/login");
  }
});

// Method to login adminstrator
myApp.post("/adminLogin", async (req, res) => {
  let userId = req.body.userId;
  let password = req.body.pass;

  // Search for administrator in MongoDB
  const administrator = await Administrator.findOne({
    userId,
    password,
  }).exec();

  if (administrator) {
    req.session.userId = administrator.userId;
    req.session.loggedIn = true;
    console.log("In adminLogin - userId found :", userId);
    res.render("admin-dashboard");
  } else {
    let loginData = {
      error: "User ID and password combination not found!",
    };
    res.render("login", loginData);
  }
});

myApp.listen(8083);
console.log("listening on port 8083");
