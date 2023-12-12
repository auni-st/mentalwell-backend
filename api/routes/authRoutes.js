const express = require('express');
const router = express.Router();

const { supabase } = require('../utils/supabase');
const { bcrypt, jwt } = require('../utils/encrypt');
const { uuidv4 } = require('../utils/uuid');
const { nodemailer } = require('../utils/nodemailer')

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in Supabase
    const { data, error } = await supabase.from('users').select('id, email, password, name, role').eq('email', email).single();
    const passwordMatch = await bcrypt.compare(password, data.password)

    if (passwordMatch) {
      let token;
      try {
        token = jwt.sign(
          { id: data.id, email: data.email, name: data.name, role: data.role },
          "secretkeyappearshere",
          { expiresIn: "5w" }
        );
        res.status(200).json({ message: 'success', data: { id: data.id, email: data.email, name: data.name, role: data.role, token: token } })
      } catch (err) {
        console.log(err);
        const error = new Error("Error! Something went wrong.");
        return next(error);
      }
    } else {
      res.status(401).json({ message: 'invalid credentials' })
    }

  } catch (error) {
    console.error('Supabase error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }

})

router.get('/accessResource', (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  //Authorization: 'Bearer TOKEN'
  if (!token) {
    res.status(200).json({ message: 'error! token was not provided' })
  }

  //Decode token
  const decodedToken = jwt.verify(token, "secretkeyappearshere");
  res.status(200).json({ message: 'success', data: { id: decodedToken.id, email: decodedToken.email, name: decodedToken.name, role: decodedToken.role } });
})

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const { data: user } = await supabase.from('users').select('id, email').eq('email', email).single();

  if (user) {
    const resetToken = uuidv4();

    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); //24 hour
    const insert = await supabase.from('password_reset_tokens').upsert([
      {
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: 'mentalwell.app@gmail.com',
      to: email,
      subject: 'Ubah Sandi',
      text: `Klik tautan berikut untuk mengubah kata sandi anda: https://mentalwell.vercel.app/ubah-sandi?token=${resetToken}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'Error sending email' });
      } else {
        console.log('Email sent:', info.response);
        res.status(200).json({ message: 'Password reset email sent successfully' });
      }
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
})

router.put('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword, newPasswordConfirmation } = req.body;

  if (newPassword !== newPasswordConfirmation) {
    return res.status(400).json({ message: 'New password and confirmation do not match' });
  }

  const { data: resetTokenData, error: tokenError } = await supabase.from('password_reset_tokens').select('user_id, expires_at').eq('token', token).single()

  if (tokenError) {
    res.status(500).json({ message: 'Error fetching reset token' })
  }

  if (!resetTokenData) {
    res.status(500).json({ message: 'Reset token has expired' })
  }

  const { user_id, expires_at } = resetTokenData;

  if (new Date(expires_at) < new Date()) {
    return res.status(400).json({ message: 'Reset token has expired' });
  }

  const saltRounds = 10; // You can adjust this based on your security requirements
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const updatePassword = await supabase.from('users').update({ password: hashedPassword }).eq('id', user_id)

  await supabase.from('password_reset_tokens').delete().eq('token', token);

  res.status(200).json({ message: 'Password reset successful!' })
})


module.exports = router;