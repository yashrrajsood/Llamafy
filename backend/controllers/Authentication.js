const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('../database/pool');
/**
 * Passport-local strategy used for authentication. This allows for authenticating using a username and password.
 */
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const conn = await pool.getConnection();
            const [rows] = await conn.query('SELECT * FROM Users WHERE email = ?', [username]);
            const user = rows[0];

            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (!bcrypt.compareSync(password, user.password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            conn.release();
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Serialize user email into the session
passport.serializeUser((user, done) => {
    done(null, user.email);
});

// Deserialize user by email
passport.deserializeUser(async (email, done) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM UserSession WHERE user_email = ?', [email]);
        const user = rows[0];
        conn.release();

        if (!user) {
            return done(null, false, { message: 'User not found.' });
        }

        done(null, user);
    } catch (err) {
        done(err);
    }
});

function login(req, res, next) {
    //specifying the "local" strategy to authenticate requests. Sets the sessionID and redirects to / if successful. 
    passport.authenticate('local', { session: true }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: info.message });
        }
        req.logIn(user, async (err) => {
            if (err) {
                return next(err);
            }
            const conn = await pool.getConnection();
            try {
                const [rows] = await conn.query('SELECT * FROM UserSession WHERE user_email = ?', [user.email]);
                if (rows.length === 0) {
                    // If no row exists for the user_email, insert a new row
                    await conn.query(
                        'INSERT INTO UserSession (user_email, session_id) VALUES (?, ?)',
                        [user.email, req.sessionID]
                    );
                    return res.status(200).json({ message: 'Logged in' });
                } else {
                    // If a row exists for the user_email, update the session_id
                    await conn.query(
                        'UPDATE UserSession SET session_id = ? WHERE user_email = ?',
                        [req.sessionID, user.email]
                    );
                    return res.status(200).json({ message: 'Logged in' });
                }

            } catch (err) {
                console.error('Error storing session ID:', err);
            } finally {
                conn.release();
            }

        });
    })(req, res, next);
}

async function logout(req, res) {
    // Set the session ID to NULL in the table
    const conn = await pool.getConnection();
    try {
        await conn.query('UPDATE UserSession SET session_id = NULL WHERE session_id = ?', [req.sessionID]);
        res.status(200).json({ message: 'Logged out' });
    } catch (err) {
        console.error('Error setting session ID to NULL:', err);
    } finally {
        conn.release();
    }
}


async function checkAuthenticated(req, res) {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT * FROM UserSession WHERE session_id = ?', [req.sessionID]);
        const userSession = rows[0];
        conn.release();

        if (userSession) {
            return res.json({ isAuthenticated: true });
        }
    } catch (err) {
        console.error('Error checking session ID:', err);
    }

    res.json({ isAuthenticated: false });
}

function getEmail(req, res) {
    if (req.user) {
        return res.json(req.user.user_email);
    } else {
        console.error('No user found with session ID:', req.sessionID);
        return res.status(200).json({ message: 'None found' });
    }
}

module.exports = {
    login,
    logout,
    checkAuthenticated,
    getEmail,
    passport,
};
