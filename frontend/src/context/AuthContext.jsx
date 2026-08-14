import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

const AuthContext = createContext(null);

// Fields the user can edit locally that should survive logout/login
const EDITABLE_FIELDS = ['firstName', 'lastName', 'avatar'];

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

    // Check if we have a locally-edited profile for this same user
    // (saved before a previous logout) and re-apply those edits on
    // top of the fresh server data, so edits aren't lost on re-login.
    let mergedUserData = userData;

    try {

      const lastSavedRaw = localStorage.getItem(
        'eventhub_last_edited_user'
      );

      if (lastSavedRaw) {

        const lastSaved = JSON.parse(lastSavedRaw);

        // Only re-apply if it's the same account
        if (lastSaved && lastSaved.id === userData.id) {

          mergedUserData = { ...userData };

          EDITABLE_FIELDS.forEach((field) => {
            if (lastSaved[field] !== undefined) {
              mergedUserData[field] = lastSaved[field];
            }
          });
        }
      }

    } catch (error) {

      console.error(
        'Could not restore saved profile edits:',
        error
      );

    }

    setUser(mergedUserData);
    setToken(tokenData);

    localStorage.setItem(
      'eventhub_token',
      tokenData
    );

    localStorage.setItem(
      'eventhub_user',
      JSON.stringify(mergedUserData)
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

    // NOTE: 'eventhub_last_edited_user' is intentionally NOT removed here,
    // so edited profile info (name/avatar) survives logout and is
    // restored on the next login.
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

      // Persist just the editable fields separately, keyed by user id,
      // so they can be restored on the next login even after logout
      // clears 'eventhub_user'.
      const editedSubset = { id: mergedUser.id };

      EDITABLE_FIELDS.forEach((field) => {
        if (mergedUser[field] !== undefined) {
          editedSubset[field] = mergedUser[field];
        }
      });

      localStorage.setItem(
        'eventhub_last_edited_user',
        JSON.stringify(editedSubset)
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