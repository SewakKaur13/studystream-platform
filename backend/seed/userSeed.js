const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const seedUsers = async () => {
  try {

    await User.deleteMany();

    const hashedPassword = await bcrypt.hash("mca@2025", 10);
    const hashedPasswordAdmin = await bcrypt.hash("mca@2025Admin", 10);

    const users = [
      {
        name: "Admin",
        enrollmentNumber: "TeacherAdm001",
        password: hashedPasswordAdmin,
        role: "admin"
      },
      {
        name: "Admin",
        enrollmentNumber: "StudentAdm002",
        password: hashedPasswordAdmin,
        role: "admin"
      },
      {
        name: "Priyanshi Agarwal",
        enrollmentNumber: "255300694001",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Arpita Jadhav",
        enrollmentNumber: "255300694002",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Bhavesh Raj",
        enrollmentNumber: "255300694003",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Foram Bhavsar",
        enrollmentNumber: "255300694004",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Bhumi Krishnani",
        enrollmentNumber: "255300694005",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Bilal Khan",
        enrollmentNumber: "255300694006",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "DivyKumar Chauhan",
        enrollmentNumber: "255300694007",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Vishwa Gohil",
        enrollmentNumber: "255300694008",
        password: hashedPassword,
        role: "student"
      },{
        name: "Hardik Vaghela",
        enrollmentNumber: "255300694009",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Harsh Ahire",
        enrollmentNumber: "255300694010",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Heer Shah",
        enrollmentNumber: "255300694011",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Hetal Solanki",
        enrollmentNumber: "255300694012",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Jaydipsinh Parmar",
        enrollmentNumber: "255300694013",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Jaykumar Patel",
        enrollmentNumber: "255300694014",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Jayveersinh Mahida",
        enrollmentNumber: "255300694015",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Smit Kariyani",
        enrollmentNumber: "255300694016",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Keya Patel",
        enrollmentNumber: "255300694017",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Ishan Khatri",
        enrollmentNumber: "255300694018",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Kishan Solanki",
        enrollmentNumber: "255300694019",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Krisha Thakar",
        enrollmentNumber: "255300694020",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Krunal Parmar",
        enrollmentNumber: "255300694021",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Niyati Lakhani",
        enrollmentNumber: "255300694022",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Harshil Lalluvadiya",
        enrollmentNumber: "255300694023",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Mahek Tantod",
        enrollmentNumber: "255300694024",
        password: hashedPassword,
        role: "student"
      },{
        name: "Meet Mochi",
        enrollmentNumber: "255300694025",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Udit Mishra",
        enrollmentNumber: "255300694026",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Mittal Chhasatiya",
        enrollmentNumber: "255300694027",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Anushka Moghe",
        enrollmentNumber: "255300694028",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Jainish Nayak",
        enrollmentNumber: "255300694029",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Nikunj Panchal",
        enrollmentNumber: "255300694030",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Om Patel",
        enrollmentNumber: "255300694031",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Het Pagi",
        enrollmentNumber: "255300694032",
        password: hashedPassword,
        role: "student"
      },{
        name: "Pankaj Parmar",
        enrollmentNumber: "255300694033",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Vineet Pardeshi",
        enrollmentNumber: "255300694034",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Chaitali Parmar",
        enrollmentNumber: "255300694035",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Hetvi Parmar",
        enrollmentNumber: "255300694036",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Nikharv Parmar",
        enrollmentNumber: "255300694037",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Meet Patel",
        enrollmentNumber: "255300694038",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Divya Prajapati",
        enrollmentNumber: "255300694039",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Jaydeep Prajapati",
        enrollmentNumber: "255300694040",
        password: hashedPassword,
        role: "student"
      },{
        name: "Keyur Prajapati",
        enrollmentNumber: "255300694041",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Nirali Prajapati",
        enrollmentNumber: "255300694042",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Suhani Prajapati",
        enrollmentNumber: "255300694043",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Pranam Patel",
        enrollmentNumber: "255300694044",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Madhu Rajput",
        enrollmentNumber: "255300694045",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Dev Rana",
        enrollmentNumber: "255300694046",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Vasant Rao",
        enrollmentNumber: "255300694047",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Jitendra Rathva",
        enrollmentNumber: "255300694048",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Samarthsinh Raulji",
        enrollmentNumber: "255300694049",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Riddhi Tantod",
        enrollmentNumber: "255300694050",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Hemil Rohit",
        enrollmentNumber: "255300694051",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Hinanshi Rushi",
        enrollmentNumber: "255300694052",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Sarthak Mujumdar",
        enrollmentNumber: "255300694053",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Avani Savani",
        enrollmentNumber: "255300694054",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Dhruv Shah",
        enrollmentNumber: "255300694055",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Mohib Shaikh",
        enrollmentNumber: "255300694056",
        password: hashedPassword,
        role: "student"
      },{
        name: "Bhavya Soni",
        enrollmentNumber: "255300694057",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Sukhdev Shiyani",
        enrollmentNumber: "255300694058",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Tahaa Mandsorwala",
        enrollmentNumber: "255300694059",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Viral Thakor",
        enrollmentNumber: "255300694060",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Harsh Vaghela",
        enrollmentNumber: "255300694061",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Ruturajsinh Vaghela",
        enrollmentNumber: "255300694062",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Vansh Patel",
        enrollmentNumber: "255300694063",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Vraj Panchal",
        enrollmentNumber: "255300694064",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Vrushti Panchal",
        enrollmentNumber: "255300694065",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Abhjit Wadkar",
        enrollmentNumber: "255300694066",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Yuvraj Dabhi",
        enrollmentNumber: "255300694067",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Oumar Saleh",
        enrollmentNumber: "255300694068",
        password: hashedPassword,
        role: "student"
      },
      {
        name: "Pasian Domel",
        enrollmentNumber: "255300694069",
        password: hashedPassword,
        role: "student"
      }
    ];

    await User.insertMany(users);

    console.log("Users seeded with hashed password");
    process.exit();

  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

seedUsers();