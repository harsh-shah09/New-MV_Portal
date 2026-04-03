/**
 * Role-based access control for HRMS portal
 * Defines page visibility and access rules for different user roles
 */

export type UserRole = 'Employee' | 'Team Lead' | 'HR' | 'Admin';

export interface PageAccess {
    path: string;
    label: string;
    roles: UserRole[];
}

/**
 * Page access configuration
 * Defines which roles can access which pages
 */
export const PAGE_ACCESS: PageAccess[] = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/leaves',
        label: 'Leave',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/holidays',
        label: 'Holidays',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/assets',
        label: 'Assets',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/my-payrolls',
        label: 'My Payslips',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/employees',
        label: 'Employees',
        roles: ['HR', 'Admin']
    },
    {
        path: '/payroll',
        label: 'Payroll',
        roles: ['Admin']
    },
    {
        path: '/nda',
        label: 'Document Manager',
        roles: ['HR', 'Admin']
    },
    {
        path: '/admin',
        label: 'Admin Console',
        roles: ['Admin']
    },
    // Additional pages that might exist
    {
        path: '/training',
        label: 'Training',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/notifications',
        label: 'Notifications',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    },
    {
        path: '/handbook',
        label: 'Handbook',
        roles: ['Employee', 'Team Lead', 'HR', 'Admin']
    }
];

/**
 * Check if a user role has access to a specific page
 * @param userRole - The user's role
 * @param pagePath - The page path to check
 * @returns boolean indicating if access is allowed
 */
export function hasPageAccess(userRole: string | undefined | null, pagePath: string): boolean {
    if (!userRole) return false;

    // Normalize the page path (remove trailing slashes and query params)
    const normalizedPath = pagePath.split('?')[0].replace(/\/$/, '') || '/';

    // Allow access to auth pages, root, and API routes
    if (normalizedPath === '/' ||
        normalizedPath.startsWith('/auth') ||
        normalizedPath.startsWith('/api')) {
        return true;
    }

    // Find the page configuration
    const pageConfig = PAGE_ACCESS.find(page => normalizedPath.startsWith(page.path));

    if (!pageConfig) {
        // If page not in config, deny access
        return false;
    }

    // Check if user's role is in the allowed roles
    return pageConfig.roles.some(role =>
        userRole.toLowerCase().includes(role.toLowerCase())
    );
}

/**
 * Get all accessible pages for a user role
 * @param userRole - The user's role
 * @returns Array of accessible page configurations
 */
export function getAccessiblePages(userRole: string | undefined | null): PageAccess[] {
    if (!userRole) return [];

    return PAGE_ACCESS.filter(page =>
        page.roles.some(role =>
            userRole.toLowerCase().includes(role.toLowerCase())
        )
    );
}

/**
 * Get user role priority for determining highest role
 * Higher number = higher privilege
 */
const ROLE_PRIORITY: Record<string, number> = {
    'Employee': 1,
    'Team Lead': 2,
    'HR': 3,
    'Admin': 4
};

/**
 * Extract the highest role from a user's role string
 * @param userRole - The user's role (can contain multiple roles)
 * @returns The highest privilege role
 */
export function getHighestRole(userRole: string | undefined | null): UserRole {
    if (!userRole) return 'Employee';

    const roleLower = userRole.toLowerCase();

    if (roleLower.includes('admin')) return 'Admin';
    if (roleLower.includes('hr')) return 'HR';
    if (roleLower.includes('team lead') || roleLower.includes('tl')) return 'Team Lead';

    return 'Employee';
}
