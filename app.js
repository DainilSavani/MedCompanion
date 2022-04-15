const express = require('express');
const path = require('path');
const morgan = require('morgan');
const { prohairesis } = require('prohairesis');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');
const session = require('express-session');
const { time } = require('console');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.static(__dirname));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render(path.join(__dirname, 'homepage'), { 'session': session.loggedin, 'not_registered': 1, 'invalid': 1 });
});
app.get('/lab_test', (req, res) => {
    res.render(path.join(__dirname, 'lab_test'), { 'session': session.loggedin, 'disease': -1 });
});
app.get('/medicine', (req, res) => {
    res.render(path.join(__dirname, 'medicine'), { 'session': session.loggedin });
});
app.get('/contact', (req, res) => {
    res.render(path.join(__dirname, 'contact'), { 'session': session.loggedin });
});
app.get('/chatbot', (req, res) => {
    res.render(path.join(__dirname, 'chatpage'), { 'session': session.loggedin });
});

const url = 'mongodb+srv://Admin:Admin123@cluster0.4dsjv.mongodb.net/MedCompanions?retryWrites=true&w=majority';
mongoose.connect(url);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
    console.log("Connected successfully");
});

const usrSchema = new mongoose.Schema({
    Id: String, Name: String, Email: String, Password: String, Address: String, Phone: Number, Bloodgroup: String, Gender: String, DOB: Date
});
const User = mongoose.model('User', usrSchema);

const bookSchema = new mongoose.Schema({
    Id: String, Type: String, UserId: String, DoctorId: String, Date: Date
});
const Booking = mongoose.model('Booking', bookSchema);

const querySchema = new mongoose.Schema({
    Name: String, Email: String, Contact: Number, Comment: String
});
const Query = mongoose.model('Query', querySchema);

const docSchema = new mongoose.Schema({
    Id: String, Name: String, Phone: Number, Email: String, Qualification: String, Field: String, Experience: String, DOJ: Date
});
const Doctor = mongoose.model('Doctor', docSchema);


var flag_u = 1;
localStorage.setItem(flag_u);
app.post('/signup', (req, res) => {
    const { name, email_add, password, address, cntc, blood, gender, dob } = req.body;
    localStorage.getItem(flag_u);
    u_id = "U" + 0 + flag_u;
    flag_u = flag_u + 1;
    localStorage.setItem(flag_u);
    const usr = new User();
    usr.Id = u_id; usr.Name = name; usr.Email = email_add; usr.Password = password; usr.Address = address; usr.Phone = cntc;
    usr.Bloodgroup = blood; usr.Gender = gender; usr.DOB = dob;
    usr.save()
        .then(() => {
            session.loggedin = true;
            session.email = email_add;
            res.render(path.join(__dirname, 'homepage'), { 'session': session.loggedin, 'not_registered': 0, 'invalid': 0 });
        })
        .catch(err => console.log(err.message));
});

app.post('/login', (req, res) => {
    const { email, psw } = req.body;
    User.findOne({ 'Email': email }, 'Password', (err, user) => {
        if (!user) {
            res.render(path.join(__dirname, 'homepage'), { 'session': session.loggedin, 'not_registered': 1, 'invalid': 0 });
        } else if (user.Password == psw) {
            session.loggedin = true;
            session.email = email;
            res.render(path.join(__dirname, 'homepage'), { 'session': session.loggedin, 'not_registered': 0, 'invalid': 0 });
        } else if (user.Password != psw) {
            res.render(path.join(__dirname, 'homepage'), { 'session': session.loggedin, 'not_registered': 0, 'invalid': 1 });
        }
    });
});

app.get('/profile', (req, res) => {
    if (session.loggedin) {
        User.findOne({ 'Email': session.email }, (err, user) => {
            const name = user.Name;
            const [f, s, l] = name.split(' ')
            user.f = f;
            var date = JSON.stringify(user.DOB);
            date = date.slice(1, 11);
            res.render(path.join(__dirname, 'profile'), { 'usr': user, 'date': date });
        });
    }
    else {
        res.send('Please login to view this page.');
    }
});
app.get('/consultation', (req, res) => {
    if (session.loggedin) {
        User.findOne({'Email': session.email}, (err, user) => {
            res.render(path.join(__dirname, 'consultation'), { 'session': session.loggedin, 'usr': user, 'booking': null });
        });
    } else {
        res.render(path.join(__dirname, 'consultation'), { 'session': session.loggedin , 'usr': null, 'booking': null});
    }
});

app.post('/logout', (req, res) => {
    session.loggedin = false;
    session.email = null;
    res.render(path.join(__dirname, 'homepage'), { 'session': session.loggedin, 'not_registered': 1, 'invalid': 1 });
});

app.post('/disease_prediction', (req, res) => {
    const { sex, age, restbps, chol, thalach, oldpeak, cp, fbs, recg, exang, slope, ca, thal } = req.body;
    var asex = [0, 0], acp = [0, 0, 0, 0], afbs = [0, 0], arecg = [0, 0, 0], aexang = [0, 0], aslope = [0, 0, 0], aca = [0, 0, 0, 0, 0], athal = [0, 0, 0, 0];
    asex[sex] = 1; acp[cp] = 1; afbs[fbs] = 1; arecg[recg] = 1; aexang[exang] = 1; aslope[slope] = 1; aca[ca] = 1; athal[thal] = 1;
    var list = []; list.push(age); list.push(restbps); list.push(chol); list.push(thalach);
    list.push(oldpeak);
    var final_list = list.concat(asex, acp, afbs, arecg, aexang, aslope, aca, athal);
    const spawn = require("child_process").spawn;
    const pythonProcess = spawn('python3', ["/home/denny3010/Desktop/Software_lab/MedCompanion/predict/predict.py", final_list]);
    pythonProcess.stdout.on('data', (data) => {
        var output = String.fromCharCode.apply(null, data).slice(0,1)
        console.log(output);
        res.render(path.join(__dirname, 'lab_test'), { 'session': session.loggedin, 'disease': Number(output)});
    });
});

var flag_b = 1;
localStorage.setItem(flag_b);
app.post('/consult_booking', (req, res) => {
    const { date, time, usrId, docId } = req.body;
    console.log(req.body);
    if (!usrId) {
        res.render(path.join(__dirname, 'consultation'), { 'session': session.loggedin , 'usr': null, 'booking': 'error'});
    }
    else {
        localStorage.getItem(flag_b);
        b_id = "B" + 0 + flag_b;
        flag_b = flag_b + 1;
        localStorage.setItem(flag_b);
        const book = new Booking();
        book.Id = b_id; book.Type = "Consultation"; book.UserId = usrId; book.DoctorId = docId; book.Date = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm:ss').format();
        book.save().then( () => {
            res.render(path.join(__dirname, 'consultation'), { 'session': session.loggedin , 'usr': null, 'booking': 'success'});
        })
        .catch(err => console.log(err));
    }
});

app.post('/contact_us', (req, res) => {
    const { name, Email, Number, comment } = req.body;
    console.log(comment);
    const query = new Query();
    query.Name = name; query.Email = Email; query.Contact = Number; query.Comment = comment;
    query.save();
    res.sendFile(path.join(__dirname, 'contact.html'), { 'session': session.loggedin });
});

app.listen(port);