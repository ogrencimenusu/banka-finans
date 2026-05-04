import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Card } from 'react-bootstrap';
import { LogIn } from 'lucide-react';

import logo from '../../assets/logo.svg';

const LoginPage = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      console.error("Login failed:", error);
      alert("Giriş yapılamadı: " + error.message);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <Card style={{ width: '450px' }} className="glass-card border-0 p-4">
        <Card.Body className="text-center p-5">
          <div className="mb-4">
            <img src={logo} alt="Logo" style={{ height: '100px' }} />
          </div>
          <h2 className="mb-2 fw-bold">Banka & Finans</h2>
          <p className="text-muted mb-5">Güvenli portföy ve nakit takibi.</p>
          <Button 
            variant="light" 
            size="lg" 
            className="w-100 d-flex align-items-center justify-content-center gap-3 shadow-sm border py-3 rounded-pill"
            onClick={handleLogin}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="24" />
            <span className="fw-medium">Google ile Giriş Yap</span>
          </Button>
          <div className="mt-5 smaller text-muted">
            Giriş yaparak kullanım koşullarını kabul etmiş olursunuz.
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default LoginPage;
