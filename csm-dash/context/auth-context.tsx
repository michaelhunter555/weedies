import { useContext, createContext, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useApi } from '@/hooks/useHttp';

interface IAuth {
    name: string;
    id: string;
    isLoggedIn?: boolean;
    handleLogin: (email: string, password: string) => void;
    handleLogout: () => void;
    jwtToken: string | null;
    hydrated: boolean;
    updateUser: (user: any) => void;
}

const authContext: IAuth = {
    name: "",
    id: "",
    isLoggedIn: false,
    handleLogin: (email: string, password: string) => {},
    handleLogout: () => {},
    jwtToken: null,
    hydrated: false,
    updateUser: (user: any) => {}
}

const AuthContext = createContext<IAuth>(authContext);

export const AuthProvider = ({ children }: {children: React.ReactNode}) => {
    const router = useRouter();
    const { request } = useApi();
    const [user, setUser] = useState<any>({
        name: "",
        id: "",
        isLoggedIn: false,
        jwtTokent: null
    })
    const [hydrated, setHydrated] = useState<boolean>(false);

    // Hydrate auth state from localStorage on the client
    useEffect(() => {
        try {
            const storage = typeof window !== 'undefined' ? localStorage.getItem("@token") : null;
            if (storage) {
                const parsed = JSON.parse(storage as string);
                const isValid = parsed?.user?.isLoggedIn && parsed?.expiration && new Date(parsed?.expiration) > new Date();
                if (isValid) {
                    setUser({
                        name: parsed.user.name ?? "",
                        id: parsed.user.id ?? "",
                        isLoggedIn: true,
                        jwtToken: parsed.user.jwtToken ?? null,
                    });
                } else {
                    // Expired or invalid token
                    localStorage.removeItem("@token");
                }
            }
        } catch (err) {
            console.log(err);
        } finally {
            setHydrated(true);
        }
    }, []);

    const login = useMutation({
        mutationKey: ['login-admin'],
        mutationFn: async (p:{email: string, password: string}) => {
            const { email, password } = p;
            return await request(
                `admin/login`, 
                'POST', 
                JSON.stringify({ email, password }),
                {"Content-Type":"application/json"}
            )
        }
    })

    const handleLogin = async (email: string, password: string) => {
        if(password && email) {
            login.mutate({ email, password}, {
                onSuccess: (data) => {
                    console.log("userloggedin:",data)
                    const newUser = {
                        name: data.name,
                        id: data.id,
                        isLoggedIn: true,
                        jwtToken: data.token,
                    }
                    setUser(newUser)

                    const expiration = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
                    localStorage.setItem("@token", JSON.stringify({ user: newUser, expiration }))
                    router.push('/');
                },
                onError: (err) => {
                    console.log(err);
                }
            })
        }
    }

    const handleLogout = async () => {
        await request(
            `user/logout`, 
            'POST', 
            null, 
            {
                Authorization: `Bearer ${user.jwtToken}`
            })
            localStorage.removeItem("@token")
        setUser({
            name: "",
            id: "",
            isLoggedIn: false,
            jwtToken: null,
        })
        router.push("/login")
    }

    const updateUser = (user: {[key: string]: keyof typeof user}) => {
        setUser((prev: any) => ({ ...user}))
    }

    return (
        <AuthContext.Provider value={{
            name: user.name,
            id: user.id,
            isLoggedIn: !!user.isLoggedIn,
            handleLogin: handleLogin,
            handleLogout: handleLogout,
            jwtToken: user.jwtToken,
            hydrated,
            updateUser,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

const useAuth = () => useContext(AuthContext);
export default useAuth;