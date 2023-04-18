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

const Ticket = mongoose.model("tickets", {
  name: String,
  email: String,
  description: String,
  imageName: String,
});

myApp.get("/", (req, res) => {
  let userType = "guest";
  if (req.session.loggedIn) {
    userType = "admin";
  }
  res.render("createTicket", { userType });
});

myApp.get("/createTicket/:userType", (req, res) => {
  let userType = req.params.userType;
  res.render("createTicket", { userType });
  console.log("In createTicket !");
});

var nameRegex = /^[a-zA-Z0-9]$/;

myApp.post(
  "/createTicket",
  [
    check("desc", "Description required").not().isEmpty(),
    check("email", "Email should be valid").isEmail(),
  ],
  function (req, res) {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.render("createTicket", { er: errors.array() });
    } else {
      var name = req.body.name;
      var email = req.body.email;
      var description = req.body.desc;

      console.log("name : ", name);
      console.log("email : ", email);

      var imageName = req.files.image.name;
      var imageFile = req.files.image;

      var imagePath = "public/uploads/" + imageName;
      imageFile.mv(imagePath, function (err) {
        console.log(err);
      });

      var pageData = {
        name: name,
        email: email,
        description: description,
        imageName: imageName,
      };

      let myCard = new Ticket(pageData);
      myCard.save();
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

// Get Admin dashboard and pass list of tickets
myApp.get("/admin-home", async (req, res) => {
  if (req.session.loggedIn) {
    const ticketsData = await Ticket.find();
    console.log("ticketsData", ticketsData);
    res.render("admin-dashboard", { ticketsData });
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
    const ticketsData = await Ticket.find();
    console.log("ticketsData", ticketsData);
    res.render("admin-dashboard", { ticketsData });
  } else {
    let loginData = {
      error: "User ID and password combination not found!",
    };
    res.render("login", loginData);
  }
});

// Get record data from database and fill the controls with this data
myApp.get("/openTicket/:id/:viewType", async (req, res) => {
  let ticketId = req.params.id;
  let viewType = req.params.viewType;
  console.log("in openTicket viewType : ", viewType);
  const ticket = await Ticket.findOne({ _id: ticketId }).exec();
  if (viewType == "view" || viewType == "delete") {
    res.render("viewticket", { viewType, ticket });
  } else if (viewType == "edit") {
    res.render("edit", { ticket });
  }
});

myApp.post(
  "/editTicket",
  [
    check("desc", "Description required").not().isEmpty(),
    check("email", "Email should be valid").isEmail(),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      res.render("createTicket", { er: errors.array() });
    } else {
      var ticketId = req.body.id;
      var name = req.body.name;
      var email = req.body.email;
      var description = req.body.desc;
      var imageName = req.files.image.name;
      var imageFile = req.files.image;

      var imagePath = "public/uploads/" + imageName;
      imageFile.mv(imagePath, function (err) {
        console.log(err);
      });

      var pageData = {
        ticketId: ticketId,
        name: name,
        email: email,
        description: description,
        imageName: imageName,
      };
      console.log("In editTicket - pageData", pageData);
      var updatedRecord = await Ticket.updateOne(
        { _id: ticketId },
        { name, email, description, imageName },
        { new: true }
      ).exec();

      console.log("Ticket updated : ", updatedRecord);
      // let myCard = new Ticket(pageData);
      // myCard.save();

      let message_header = "Thank You!";
      let message_body = "A new request has been successfully created!";
      res.render("displayMessage", { message_header, message_body });
    }
  }
);

myApp.post("/deleteTicket", async (req, res) => {
  let id = req.body.id;
  await Ticket.findByIdAndRemove({ _id: id }).exec();
  let message_header = "Thank You!";
  let message_body = "The record has been successfully deleted!";
  res.render("displayMessage", { message_header, message_body });
});

myApp.listen(8083);
console.log("listening on port 8083");
