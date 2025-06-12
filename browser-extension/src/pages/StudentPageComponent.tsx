import { Col, Container, Image, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import List from "../components/ListComponent";
import { useAuth } from "../providers/AuthenticationProvider";
import type { JSX } from "react";

/**
 * StudentPage component displays the student's profile information. It renders the student's profile information in a structured layout.
 * @author Diego Da Giau
 * @returns {JSX.Element} The rendered UserPage component.
 */
export default function StudentPage(): JSX.Element {
    const student = useAuth().student;
    const navigate = useNavigate();
    const goBack = () => {
        navigate(-1);
    }

    return (
        <>
            {/* Header */}
            <Container>
                <Row className="mb-3">
                    <Col xs={1} className="my-auto">
                        <Image src="images/icons/arrow.svg" alt="Arrow icon" className="cursor-pointer" onClick={goBack} />
                    </Col>
                    <Col className="text-start ">
                        <strong className="text-24">Your profile</strong>
                    </Col>
                </Row>
            </Container>
            {/* Student's information */}
            <Container>
                <Row>
                    <List object={student.toObject()} />
                </Row>
            </Container>
        </>
    );
}
