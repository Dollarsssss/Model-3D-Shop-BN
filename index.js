const express = require('express')
const cors = require('cors')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
require('dotenv').config()



const app = express()
const port = 3000
app.use(bodyParser.json()) 

const connection = mysql.createConnection(process.env.DATABASE_URL);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/users', (req, res) => {
   connection.query(
    'SELECT * FROM users',
    function (err,results,fields){
        res.send(results)
    }
   )
})

app.get('/product', (req, res) => {
   connection.query(
    'SELECT * FROM product',
    function (err,results,fields){
        res.send(results)
    }
   )
})

app.post('/check-email', (req, res) => {
    const email = req.body.email;
    connection.query(
        'SELECT * FROM users WHERE email = ?', [email],
        function (err, results, fields) {
            if (err) {
                res.send('Something Wrong: ' + err);
            } else {
                if (results.length > 0) {
                    res.status(400).send('Email aleready use');
                } else {
                    res.status(200).send('Email can use');
                }
            }
        }
    );
});

app.post('/invoices', (req, res) => {
    const userId = req.body.user_id;
    if (!userId) {
        return res.status(400).send('Missing user_id');
    }

    const query = 'SELECT * FROM invoices WHERE user_id = ?';
    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).send('An error occurred while fetching invoices');
        }

        const invoiceIds = results.map(invoice => invoice.invoice_id);
        const detailsQuery = 'SELECT * FROM details WHERE invoice_id IN (?)';
        connection.query(detailsQuery, [invoiceIds], (detailsError, detailsResults) => {
            if (detailsError) {
                console.error(detailsError);
                return res.status(500).send('An error occurred while fetching invoice details');
            }

            results.forEach(invoice => {
                invoice.details = detailsResults.filter(detail => detail.invoice_id === invoice.invoice_id);
                if (invoice.date) {

                    invoice.date = new Date(invoice.date.getTime() - (invoice.date.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                }
            });

            res.json(results);
        });
    });
});



app.post('/register', (req, res) => {
    connection.query(
        'INSERT INTO users(`fname`,`lname`,`email`,`password`,`phone`,`avatar`,`address`)VALUES(?,?,?,?,?,?,?)',
        [req.body.fname, req.body.lname, req.body.email, req.body.password, req.body.phone, req.body.avatar,req.body.address],
        function(err, results, fields){
            if(err){
                console.log('Error in POST /users', err);
                res.status(500).send('Error adding user');
            }else{
                res.status(201).send(results)
            }
        }
    )

})

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    connection.query(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        [email, password],
        function(err, results, fields){
            if(err){
                console.log('Error in POST /login', err);
                res.status(500).send('Error logging in');
            }else{
                if(results.length > 0){
                    res.status(200).send('Login successful');
                }else{
                    res.status(401).send('Invalid credentials');
                }
            }
        }
    )
});

app.post('/order', (req, res) => {
    const { invoices, details } = req.body;

    const invoiceQuery = `INSERT INTO invoices (user_id, date , payment , address) VALUES 
    (${invoices.user_id}, '${invoices.date}' ,'${invoices.payment}' ,'${invoices.address}')`;
    connection.query(invoiceQuery, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('An error occurred while saving the invoice.');
        }

        const invoiceId = result.insertId;
        details.forEach(detail => {
            const detailQuery = `INSERT INTO details (invoice_id, product_name, product_price, product_quantity, total_price) VALUES 
            (${invoiceId}, '${detail.product_name}', ${detail.product_price}, ${detail.product_quantity}, ${detail.total_price})`;
            connection.query(detailQuery, (err, result) => {
                if (err) {
            console.error(err);
            return res.status(500).send('An error occurred while saving the invoice.');
        }
            });
        });

        res.status(200).send('Invoice and details saved successfully.');
    });
});


app.put('/update_profile', (req, res) => {
    const { email, fname, lname, phone, avatar ,address } = req.body;
    connection.query(
        'UPDATE users SET fname = ?, lname = ?, phone = ?, avatar = ? , address = ? WHERE email = ?',
        [fname, lname, phone, avatar, address ,email],
        function(err, results, fields){
            if(err){
                console.log('Error in PUT /update_profile', err);
                res.status(500).send('Error updating profile');
            }else{
                if(results.affectedRows > 0){
                    res.status(200).send('Profile updated successfully');
                }else{
                    res.status(401).send('Invalid credentials');
                }
            }
        }
    )
});

app.put('/update_address', (req, res) => {
    const { email , address } = req.body;
    connection.query(
        'UPDATE users SET address = ? WHERE email = ?',
        [address ,email],
        function(err, results, fields){
            if(err){
                console.log('Error in PUT /update_profile', err);
                res.status(500).send('Error updating profile');
            }else{
                if(results.affectedRows > 0){
                    res.status(200).send('Profile updated successfully');
                }else{
                    res.status(401).send('Invalid credentials');
                }
            }
        }
    )
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})