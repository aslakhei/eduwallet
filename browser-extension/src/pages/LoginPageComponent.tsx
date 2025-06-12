import "../styles/LoginPageStyle.css";

import { Col, Container, Image, Row } from "react-bootstrap";
import Form from 'react-bootstrap/Form';
import { useAuth } from "../providers/AuthenticationProvider";
import { useState } from "react";
import type { JSX } from "react";


/**
 * LoginPage component renders a login form for users to authenticate with their ID and password.
 * @author Diego Da Giau
 * @returns {JSX.Element} The rendered login page component.
 */
export default function LoginPage(): JSX.Element {
    const login = useAuth().login;
    const [id, setId] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        login({ id: id, password: password });
    };

    return (
        <>
            <Container className="h-100 d-flex flex-column justify-content-center">
                {/* App logo */}
                <Row className="mb-4">
                    <Col>
                        <span id='main-logo'>Edu<span className='purple-text'>Wallet</span></span>
                    </Col>
                    <Col className="d-flex align-items-center">
                        <Image fluid alt="EduWallet logo" src="/images/icons/icon.svg" width="37" height="37" />
                    </Col>
                </Row>
                {/* Login message */}
                <Row className="medium-text">
                    <Col>
                        Log in with your id and password
                    </Col>
                </Row>
                {/* Login form */}
                <Form className="w-100" onSubmit={handleSubmit}>
                    <Form.Group controlId="exampleForm.ControlInput1" className="floating-label">
                        <Form.Label className="form-input-label">ID</Form.Label>
                        <Form.Control className="form-input" type="text" inputMode="numeric" value={id} required onChange={ev => setId(ev.target.value)} />
                    </Form.Group>
                    <Form.Group controlId="exampleForm.ControlTextarea1" className="floating-label">
                        <Form.Label className="form-input-label">Password</Form.Label>
                        <Form.Control className="form-input" type="password" value={password} required onChange={ev => setPassword(ev.target.value)} />
                    </Form.Group>
                    <button type='submit' className="mt-4">Login</button>
                </Form>
            </Container>
        </>
    )
}
