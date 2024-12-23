import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { authService } from '../services/authService';
import './Login.css';

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    localStorage.clear();
    
    // Check if the user is logging in as admin
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('username', 'admin');
      toast.success('Logged in as Admin');
      navigate('/admin-dashboard');
      return;
    }

    try {
      const data = await authService.login(username, password);
      toast.success(data.message || 'Login successful');
      navigate('/onboarding');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.message;
      toast.error('Login failed: ' + errorMessage);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const data = await authService.signup({
        name,
        username,
        email,
        password,
        confirmPassword
      });
      toast.success(data.message || 'Registration successful');
      setIsSignup(false);
    } catch (error) {
      let errorMessage;
      
      if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
        // Handle validation errors array
        errorMessage = error.response.data.detail
          .map(err => err.msg)
          .join(', ');
      } else {
        errorMessage = error.response?.data?.detail || 
                      error.response?.data?.error || 
                      error.message;
      }
      
      toast.error('Signup failed: ' + errorMessage);
    }
  };

  return (
    <div className="login-page">
      <ToastContainer />
      <div className="curved-background">
        <h1 className="left-title">Are You In Problem?</h1>
      </div>
      <h2 className="right-title">Check Your Depression Level</h2>
      <div className="login-container">
        <div className="login-box">
          <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>
          <form onSubmit={isSignup ? handleSignup : handleLogin}>
            {isSignup && (
              <>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </>
            )}
            {!isSignup && (
              <>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}
            <button type="submit" className="btn btn-primary">
              {isSignup ? 'Sign Up' : 'Login'}
            </button>
            {isSignup ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSignup(false)}
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSignup(true)}
              >
                Sign Up
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
