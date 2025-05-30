import "../styles/CoursePageStyle.css";
import "../styles/ListComponentStyle.css"

import { useLocation, useNavigate } from "react-router-dom";
import { Result } from "../models/student";
import { Col, Container, Image, Row } from "react-bootstrap";
import List from "../components/ListComponent";
import type { JSX } from "react";
import { useUniversities } from "../providers/UniversitiesProvider";
import { ipfsConfig } from "../utils/conf";

/**
 * CoursePage component renders the detailed page for a specific course.
 * @author Diego Da Giau
 * @returns {JSX.Element} The rendered course page component.
 */
export default function CoursePage(): JSX.Element {
    // Get route state and navigation utilities
    const location = useLocation();
    const navigate = useNavigate();

    // Extract course result from route state
    const result: Result = location.state.result;

    // Get universities from context
    const universities = useUniversities().universities;

    // Create formatted result object for display
    const resultObj = {
        code: result.code,
        ects: result.ects,
        // Map university address to name, fallback to 'Unknown' if not found
        university: universities.find(u =>
            u.accountAddress === result.university
        )?.name || 'Unknown University',
        degreeCourse: result.degreeCourse,
        grade: result.grade,
        date: result.date,
    };

    // Navigation handler for back button
    const goBack = () => {
        navigate(-1);
    }

    return (
        <>
            {/* Header */}
            <Container>
                <Row className="mb-3">
                    <Col className="my-auto">
                        <Image src="images/icons/arrow.svg" alt="Arrow icon" className="cursor-pointer" onClick={goBack} />
                    </Col>
                    <Col className="text-end">
                        <Image src="images/icons/student.svg" alt="StudentModel icon" className="cursor-pointer" onClick={() => navigate("/student")} />
                    </Col>
                </Row>
            </Container>

            {/* Course title */}
            <Container>
                <Row id="course-title" className="mb-3">
                    <Col>
                        {result.name}
                    </Col>
                </Row>

                {/* Course details */}
                <Row>
                    <List object={resultObj} />
                    {/* Render certificate section if CID exists */}
                    {result.certificateCid !== "" ? <Certificate certificateCID={result.certificateCid} /> : <></>}
                </Row>
            </Container>
        </>
    );
}

/**
 * Certificate component displays a link to the course certificate stored on IPFS
 * @param {CertificateProps} props - Component props
 * @returns {JSX.Element} Certificate section with IPFS link
 */
function Certificate(props: CertificateProps): JSX.Element {
    const certificateCid = props.certificateCID;

    return (
        <>
            <hr className="my-2" />
            <Container className="list">
                <Row>
                    <Col className="purple-text text-12 list-title">
                        Certificate
                    </Col>
                </Row>
                <Row>
                    <Col className="text-15 list-content">
                        <a className="" href={ipfsConfig.gatewayUrl + certificateCid} target="_blank">Click to open the certificate</a>
                    </Col>
                </Row>
            </Container>
        </>
    );
}

/**
 * Properties for the Certificate component.
 * @author Diego Da Giau
 */
interface CertificateProps {
    certificateCID: string,
}
