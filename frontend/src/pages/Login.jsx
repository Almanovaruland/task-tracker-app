import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Login = () => {
    // State Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // State Lupa Password
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.users));
            
            toast.success("Login berhasil!");
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login gagal. Periksa kredensial Anda.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // TODO: Integrasikan dengan endpoint backend sungguhan, misalnya /api/auth/forgot-password
            // await api.post('/auth/forgot-password', { email: resetEmail });
            
            setTimeout(() => {
                toast.success("Tautan reset password telah dikirim ke email Anda!");
                setIsForgotPassword(false);
                setResetEmail('');
                setIsLoading(false);
            }, 1000);
        } catch (err) {
            toast.error('Gagal mengirim permintaan reset password.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#362765] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 transition-all duration-300">
                <div className="flex justify-center mb-6">
                    <div className="bg-[#362765] p-4 rounded-2xl shadow-lg text-white">
                        <CheckSquare size={36} />
                    </div>
                </div>
                
                {!isForgotPassword ? (
                    /* FORM LOGIN */
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-800">Smart Task</h1>
                            <p className="text-gray-400 text-sm mt-2">Masuk ke aplikasi task tracker</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <input 
                                type="email" 
                                required 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                className="w-full px-5 py-4 bg-[#f0f4fd] border-none rounded-2xl focus:ring-2 focus:ring-[#362765] outline-none text-sm" 
                                placeholder="Email Address" 
                            />
                            
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="w-full px-5 py-4 bg-[#f0f4fd] border-none rounded-2xl focus:ring-2 focus:ring-[#362765] outline-none text-sm pr-12" 
                                    placeholder="Password" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#362765] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button 
                                    type="button" 
                                    onClick={() => setIsForgotPassword(true)}
                                    className="text-sm text-[#362765] font-semibold hover:underline"
                                >
                                    Lupa Password?
                                </button>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full bg-[#362765] hover:bg-[#251a4a] text-white font-bold py-4 rounded-2xl shadow-lg transition-all disabled:opacity-70 mt-2"
                            >
                                {isLoading ? 'Memproses...' : 'Sign In'}
                            </button>
                        </form>
                    </>
                ) : (
                    /* FORM LUPA PASSWORD */
                    <>
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
                            <p className="text-gray-400 text-sm mt-2">Masukkan email Anda untuk menerima tautan reset</p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <input 
                                type="email" 
                                required 
                                value={resetEmail} 
                                onChange={(e) => setResetEmail(e.target.value)} 
                                className="w-full px-5 py-4 bg-[#f0f4fd] border-none rounded-2xl focus:ring-2 focus:ring-[#362765] outline-none text-sm" 
                                placeholder="Alamat Email Anda" 
                            />
                            
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full bg-[#362765] hover:bg-[#251a4a] text-white font-bold py-4 rounded-2xl shadow-lg transition-all disabled:opacity-70"
                            >
                                {isLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}
                            </button>

                            <button 
                                type="button" 
                                onClick={() => setIsForgotPassword(false)}
                                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-[#362765] font-semibold text-sm transition-colors pt-2"
                            >
                                <ArrowLeft size={16} /> Kembali ke Login
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;