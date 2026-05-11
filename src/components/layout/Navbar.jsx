import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Home, Landmark, PieChart, Plus, Settings } from 'lucide-react';

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">Banka & Finans</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className="d-flex align-items-center gap-1">
              <Home size={18} /> Anasayfa
            </Nav.Link>
            
            <Nav.Link as={Link} to="/banks" className="d-flex align-items-center gap-1">
              <Landmark size={18} /> Banka Tanımları
            </Nav.Link>
            <Nav.Link as={Link} to="/bank-transactions" className="d-flex align-items-center gap-1">
              <Plus size={18} /> Banka İşlemleri
            </Nav.Link>

            <Nav.Link as={Link} to="/finance" className="d-flex align-items-center gap-1">
              <PieChart size={18} /> Finans İşlemleri
            </Nav.Link>
          </Nav>
          <Nav>
            <div className="d-flex align-items-center gap-3 text-light">
              <span>{user?.displayName}</span>
              <Button variant="outline-danger" size="sm" onClick={handleLogout} className="d-flex align-items-center gap-1">
                <LogOut size={16} /> Çıkış
              </Button>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
