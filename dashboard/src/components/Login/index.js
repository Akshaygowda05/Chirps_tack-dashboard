import React, { useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  UserOutlined, 
  LockOutlined, 
  EyeInvisibleOutlined, 
  EyeTwoTone 
} from '@ant-design/icons';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleLogin = (values) => {
    const { username, password } = values;
    if (username === 'admin' && password === 'admin') {
      onLogin();
      message.success('Login Successful!');
      navigate('/');
    } else {
      message.error('Invalid username or password');
    }
  };

  useEffect(() => {
    // Add fade-in class after component mounts
    const taglines = document.querySelectorAll('.tagline');
    taglines.forEach((tagline, index) => {
      setTimeout(() => {
        tagline.classList.add('visible');
      }, index * 400);
    });
  }, []);

  return (
    <div 
      className="login-background"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundImage: "url('/solarpannel.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundBlendMode: 'multiply',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <div 
        className="login-container"
        style={{
          width: 350,
          padding: 30,
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(13, 179, 158, 0.2)',
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            backgroundColor: '#0DB39E',
          }}
        />

        <img
          src="Aegeus-technologies-logo.png"
          alt="Company Logo"
          style={{
            width: '150px',
            marginBottom: 25,
            marginLeft: 70,
            borderRadius: 8,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        />

        <div className="taglines-container" style={{
          marginBottom: 30,
          position: 'relative'
        }}>
          <h2 
            className="tagline"
            style={{
              color: '#0DB39E',
              fontWeight: 500,
              fontSize: '0.73rem',
              margin: '0 0 10px 0',
              opacity: 0,
              transform: 'translateY(20px)',
              transition: 'all 0.6s ease-out',
            }}
          >
            Protecting Assets
          </h2>
          <h2 
            className="tagline"
            style={{
              color: '#0DB39E',
              fontWeight: 500,
              fontSize: '0.73rem',
              margin: 0,
              opacity: 0,
              transform: 'translateY(20px)',
              transition: 'all 0.6s ease-out',
            }}
          >
            Improving Efficiency
          </h2>
        </div>

        <style>
          {`
            .tagline.visible {
              opacity: 1 !important;
              transform: translateY(0) !important;
            }
            
            .tagline:hover {
              transform: scale(1.05) !important;
              transition: transform 0.3s ease !important;
            }
          `}
        </style>

        <Form
          name="login"
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              placeholder="Username" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
              placeholder="Password" 
              size="large"
              iconRender={(visible) => 
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              style={{
                width: '100%',
                backgroundColor: '#0DB39E',
                borderColor: '#0DB39E',
                height: '45px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: 8,
                transition: 'all 0.3s ease',
              }}
              className="login-form-button"
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#0DA392';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#0DB39E';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Log In
            </Button>
          </Form.Item>
        </Form>

        <div 
          style={{ 
            marginTop: 16, 
            color: '#0DB39E', 
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Forgot Password?
        </div>
      </div>
    </div>
  );
};

export default Login;