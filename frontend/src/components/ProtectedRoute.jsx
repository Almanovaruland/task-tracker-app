import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const token = localStorage.getItem('token');
    // Jika tidak ada token di localStorage, paksa redirect ke /login
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;