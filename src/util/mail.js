const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');

const transport = nodemailer.createTransport(
  sendGridTransport({
    auth: {
      api_key: process.env.SENDGRID_KEY,
    },
  })
);

const makeANiceEmail = (user, text) => `
<div style="
border: 2px solid black;
border-radius: 10px;
padding: 1.3rem;
display: grid;
place-items: center;
font-family: sans-serif;
line-height: 1.5;
font-size: 22px;
">
<h2>Hello ${user} !</h2>
<h4>${text}</h4>
<p>A très vite ${user},</p>

<p>😘😘, Bakate</p>
</div>
`;
module.exports = { makeANiceEmail, transport };
