import "../styles/HomePageStyle.css";
import { Col, Container, Image, Row } from "react-bootstrap";
import { Result } from "../models/student";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import type { JSX } from "react";
import University from "../models/university";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthenticationProvider";
import { useUniversities } from "../providers/UniversitiesProvider";
import Header from "../components/HeaderComponent";

/**
 * Homepage component renders the main page of the application.
 * @author Diego Da Giau
 * @returns {JSX.Element} The rendered homepage component.
 */
export default function Homepage(): JSX.Element {
    // Get authenticated student data from context
    const student = useAuth().student;

    // Get universities data and fetch function from context
    const universities = useUniversities().universities;

    // Calculate total credits from completed courses (with grades)
    const creditNumber = student.getResults()
        .filter(r => r.grade !== "")
        .reduce((acc, val) => acc + val.ects, 0);

    // Track which university's results are being displayed
    const [activeUniversity, setActiveUniversity] = useState<string>("");

    // Set first university as active when data is loaded
    useEffect(() => {
        if (universities.length > 0) {
            setActiveUniversity(universities[0].accountAddress);
        }
    }, [universities.length]);

    return (
        <>
            {/* Header */}
            <Header title="Wallet" />

            {/* Student's general data */}
            <Container>
                <Row className="mb-3">
                    <Col className="text-20">
                        Hello <strong>{student.name}</strong>
                    </Col>
                </Row>
                {/* Credits ballance */}
                <Row className="my-3">
                    <Col className="image-container mx-3">
                        <Image src="images/mashUserCredits.svg" fluid />
                        <div className="overlay-text">
                            <p className="text-16 mb-3">Total credits balance</p>
                            <strong className="text-24">{creditNumber} ECTS</strong>
                        </div>
                    </Col>
                </Row>
            </Container>
            {/* Results part */}
            <Container>
                <Row className="mt-3 mb-2">
                    {universities.filter(u => student.getResultsByUniversity(u.accountAddress).length > 0).map(u => <UniversityButton key={u.accountAddress} university={u} activeUniversity={activeUniversity} setActiveUniversity={setActiveUniversity} />)}
                </Row>
                <Container className="p-0 main-content courses-list">
                    {student.getResults().length === 0 ?
                        "Still no academic records to show" :
                        <UniversityResults results={student.getResultsByUniversityGroupedByCourseDegree(activeUniversity)} />
                    }
                </Container>
            </Container>
        </>
    );
}

/**
 * UniversityButton component renders a button for each university.
 * @author Diego Da Giau
 * @param {UniversityButtonProps} props - The properties passed to the component.
 * @returns {JSX.Element} The rendered university button component.
 */
function UniversityButton(props: UniversityButtonProps): JSX.Element {
    const university = props.university;
    const activeUniversity = props.activeUniversity;
    const setActiveUniversity = props.setActiveUniversity;

    return (
        <Col className={"text-center" + " " + (activeUniversity === university.accountAddress ? "underline" : "")}>
            <div className="menu-option" onClick={() => setActiveUniversity(university.accountAddress)}>{university.shortName}</div>
        </Col>
    );
}

/**
 * Properties for the UniversityButton component.
 * @author Diego Da Giau
 */
interface UniversityButtonProps {
    university: University;
    activeUniversity: string;
    setActiveUniversity: Dispatch<SetStateAction<string>>;
}

/**
 * UniversityResults component renders the results for a university.
 * @author Diego Da Giau
 * @param {UniversityResultsProps} props - The properties passed to the component.
 * @returns {JSX.Element} The rendered university results component.
 */
function UniversityResults(props: UniversityResultsProps): JSX.Element {
    const results: { [key: string]: Result[] } = props.results;
    const degreeCourses: string[] = Object.keys(results);

    return (
        <>
            {/* Courses results for a single university */}
            {degreeCourses.map(d => <DegreeCourseResults key={d} course={d} results={results[d]} />)}
        </>
    );
}

/**
 * Properties for the UniversityResults component.
 * @author Diego Da Giau
 */
interface UniversityResultsProps {
    results: { [key: string]: Result[] };
}

/**
 * DegreeCourseResults component renders the results for a degree course.
 * @author Diego Da Giau
 * @param {DegreeCourseResultsProps} props - The properties passed to the component.
 * @returns {JSX.Element} The rendered degree course results component.
 */
function DegreeCourseResults(props: DegreeCourseResultsProps): JSX.Element {
    const results = props.results;
    const course = props.course;

    return (
        <>
            {/* Courses results grouped by degree course */}
            <Row className="my-2 degree-course">
                <Col className="">
                    {course}
                </Col>
            </Row>
            <Row>
                <Container>
                    {results.map(r => <DegreeCourseResult key={r.code} result={r} />)}
                </Container>
            </Row>
        </>
    );
}

/**
 * Properties for the DegreeCourseResults component.
 * @author Diego Da Giau
 */
interface DegreeCourseResultsProps {
    results: Result[];
    course: string;
}

/**
 * DegreeCourseResult component renders a single result for a degree course.
 * @author Diego Da Giau
 * @param {DegreeCourseResultProps} props - The properties passed to the component.
 * @returns {JSX.Element} The rendered degree course result component.
 */
function DegreeCourseResult(props: DegreeCourseResultProps): JSX.Element {
    const result = props.result;
    const navigate = useNavigate();
    const handleClick = () => {
        navigate("/wallet/" + result.code, { state: { result } });
    }

    return (
        <>
            {/* Single course result */}
            <Row className="ps-2 cursor-pointer" onClick={handleClick}>
                <Col className="p-0">
                    <Container className="text-14">
                        <Row>
                            <Col className="course-name">
                                {result.name}
                            </Col>
                        </Row>
                        <Row>
                            <Col className="course-code">
                                {result.code}
                            </Col>
                        </Row>
                    </Container>
                </Col>
                <Col xs={3} className="p-0 text-center course-info course-grade align-self-center">
                    {result.grade ? result.grade : ""}
                </Col>
                <Col xs={3} className="p-0 text-center course-info align-self-center">
                    {result.ects ? result.ects : ""}
                </Col>
            </Row>
        </>
    );
}

/**
 * Properties for the DegreeCourseResult component.
 */
interface DegreeCourseResultProps {
    result: Result;
}
