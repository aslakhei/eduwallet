import '../styles/PermissionPageStyle.css';

import { useEffect } from "react";
import type { JSX } from "react"
import Header from "../components/HeaderComponent";
import { PermissionType, type Permission } from "../models/permissions";
import { Col, Container, Row } from "react-bootstrap";
import { usePermissions } from '../providers/PermissionsProvider';
import { useUniversities } from '../providers/UniversitiesProvider';
import UniversityModel from '../models/university';

/**
 * Main permissions page component for managing university access permissions.
 * Displays all permission requests and granted permissions organized by category.
 * @author Diego Da Giau
 * @returns {JSX.Element} The permissions page component
 */
export default function PermissionsPage(): JSX.Element {
    // Get permissions data and functions from context
    const { requests, read, write, updatePermissions, loadPermissions } = usePermissions();

    /**
     * Forwards permission action requests to the context provider.
     * Triggers the permission update process (approve requests or revoke permissions) through the updatePermissions context method.
     * @param {Permission} permission - The permission to process
     * @returns {Promise<void>} A promise that resolves when the action is initiated
     */
    const handleClick = async (permission: Permission): Promise<void> => {
        await updatePermissions(permission);
    };

    // Load permissions data when component mounts
    useEffect(() => {
        loadPermissions();
    }, [])

    return (
        <>
            {/* Header */}
            <Header title="Permissions" />
            {/* Body */}
            <div className='main-content permissions-list'>
                <Container className='my-2'>
                    <PermissionsByCategory permissions={requests} title="Requests" handleClick={handleClick} />
                </Container>
                <Container className='my-2'>
                    <PermissionsByCategory permissions={read} title="Read" handleClick={handleClick} />
                </Container>
                <Container className='my-2'>
                    <PermissionsByCategory permissions={write} title="Write" handleClick={handleClick} />
                </Container>
            </div>
        </>
    );
}

/**
 * Interface for PermissionsByCategory component props.
 * @author Diego Da Giau
 */
interface PermissionsByCategoryProps {
    /** Array of permissions in this category */
    permissions: Permission[];
    /** Display title for the category */
    title: string;
    /** Callback function for permission action buttons */
    handleClick: (permission: Permission) => void;
}

/**
 * Component that displays a category of permissions with a title.
 * Shows all permissions in the category or an empty message if none exist.
 * @author Diego Da Giau
 * @param {PermissionsByCategoryProps} props - Component properties
 * @returns {JSX.Element} The permissions category component
 */
function PermissionsByCategory(props: PermissionsByCategoryProps): JSX.Element {
    const permissions = props.permissions;
    const title = props.title;
    const handleClick = props.handleClick;

    // Get universities data from context to display university names
    const universities = useUniversities().universities;

    return (
        <>
            <Row>
                <Col className='category-title'>
                    {title}
                </Col>
            </Row>
            {permissions.length > 0 ? permissions.map(p => <Permission key={p.university} permission={p} handleClick={handleClick} university={universities.find(u => u.accountAddress === p.university)} />) : <EmptyCategory />}
        </>
    );
}

/**
 * Component displayed when a permissions category has no permissions.
 * @author Diego Da Giau
 * @returns {JSX.Element} The empty category component
 */
function EmptyCategory(): JSX.Element {
    return (
        <>
            <Row>
                <Col className='text-14'>
                    No permissions for this category
                </Col>
            </Row>
        </>
    );
}

/**
 * Interface for Permission component props.
 * @author Diego Da Giau
 */
interface PermissionProps {
    /** The permission object containing details about the permission */
    permission: Permission;
    /** The university model associated with this permission (or undefined if not found) */
    university: UniversityModel | undefined;
    /** Callback function for when the permission action button is clicked */
    handleClick: (permission: Permission) => void;
}

/**
 * Component that displays a single permission with university name and action button.
 * Button text/style changes based on whether it's a request or granted permission.
 * @author Diego Da Giau
 * @param {PermissionProps} props - Component properties
 * @returns {JSX.Element} The individual permission component
 */
function Permission(props: PermissionProps): JSX.Element {
    const permission = props.permission;
    const university = props.university;
    const handleClick = props.handleClick;

    let label = "";
    if (permission.request && permission.type === PermissionType.Read) {
        label = "Read";
    } else if (permission.request && permission.type === PermissionType.Write) {
        label = "Write";
    } else {
        label = "Revoke";
    }

    return (
        <>
            <Row className="align-items-center mb-1">
                <Col xs={9} className='text-14'>
                    {university ? university.name : "Unknown university"}
                </Col>
                <Col>
                    <button className={"permission-button" + " " + (permission.request ? "request" : "revoke")} onClick={() => handleClick(permission)}>{label}</button>
                </Col>
            </Row>
        </>
    );
}
