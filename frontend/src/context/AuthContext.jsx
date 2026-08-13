import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);


  /* =========================================================
     LOAD SAVED LOGIN
  ========================================================= */

  useEffect(() => {

    const savedToken =
      localStorage.getItem(
        'eventhub_token'
      );

    const savedUser =
      localStorage.getItem(
        'eventhub_user'
      );

    if (savedToken && savedUser) {

      setToken(savedToken);

      try {

        setUser(
          JSON.parse(savedUser)
        );

      } catch (error) {

        console.error(
          'Invalid saved user:',
          error
        );

        localStorage.removeItem(
          'eventhub_user'
        );

      }
    }

    setLoading(false);

  }, []);


  /* =========================================================
     LOGIN
  ========================================================= */

  const login = (
    userData,
    tokenData
  ) => {

    setUser(userData);
    setToken(tokenData);

    localStorage.setItem(
      'eventhub_token',
      tokenData
    );

    localStorage.setItem(
      'eventhub_user',
      JSON.stringify(userData)
    );
  };


  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout = () => {

    setUser(null);
    setToken(null);

    localStorage.removeItem(
      'eventhub_token'
    );

    localStorage.removeItem(
      'eventhub_user'
    );
  };


  /* =========================================================
     UPDATE USER
  ========================================================= */

  const updateUser = (
    updatedFields
  ) => {

    setUser((previousUser) => {

      if (!previousUser) {
        return previousUser;
      }

      const mergedUser = {
        ...previousUser,
        ...updatedFields,
      };

      localStorage.setItem(
        'eventhub_user',
        JSON.stringify(
          mergedUser
        )
      );

      return mergedUser;
    });
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () =>
  useContext(AuthContext);