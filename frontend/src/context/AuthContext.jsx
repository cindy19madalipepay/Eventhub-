import {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

const AuthContext = createContext(null);

/*
  These MUST match the actual fields returned by the backend/database.
  Your backend uses:
    first_name
    last_name
    profile_picture
*/
const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'profile_picture',
];

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);


  /* =========================================================
     LOAD SAVED LOGIN
  ========================================================= */

  useEffect(() => {

    const savedToken = localStorage.getItem(
      'eventhub_token'
    );

    const savedUser = localStorage.getItem(
      'eventhub_user'
    );

    if (savedToken && savedUser) {

      try {

        const parsedUser = JSON.parse(savedUser);

        setToken(savedToken);
        setUser(parsedUser);

      } catch (error) {

        console.error(
          'Invalid saved user:',
          error
        );

        localStorage.removeItem(
          'eventhub_user'
        );

        localStorage.removeItem(
          'eventhub_token'
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

    let mergedUserData = {
      ...userData,
    };

    try {

      const lastSavedRaw =
        localStorage.getItem(
          'eventhub_last_edited_user'
        );

      if (lastSavedRaw) {

        const lastSaved =
          JSON.parse(lastSavedRaw);

        /*
          Only restore the saved profile if it belongs
          to the same user.
        */
        if (
          lastSaved &&
          String(lastSaved.id) ===
            String(userData.user_id || userData.id)
        ) {

          EDITABLE_FIELDS.forEach((field) => {

            if (
              lastSaved[field] !== undefined &&
              lastSaved[field] !== null
            ) {

              mergedUserData[field] =
                lastSaved[field];

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


    /* =======================================================
       SAVE LOGIN
    ======================================================= */

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

    /*
      IMPORTANT:
      We DO NOT remove eventhub_last_edited_user.

      This allows the updated profile picture/name
      to be restored after the next login.
    */
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

      /*
        Always use profile_picture,
        NOT profile_photo.
      */
      const mergedUser = {
        ...previousUser,
        ...updatedFields,
      };


      /* =====================================================
         SAVE CURRENT USER
      ===================================================== */

      localStorage.setItem(
        'eventhub_user',
        JSON.stringify(mergedUser)
      );


      /* =====================================================
         SAVE EDITABLE PROFILE DATA
      ===================================================== */

      const userId =
        mergedUser.user_id ||
        mergedUser.id;

      const editedSubset = {
        id: userId,
      };

      EDITABLE_FIELDS.forEach((field) => {

        if (
          mergedUser[field] !== undefined
        ) {

          editedSubset[field] =
            mergedUser[field];

        }

      });


      localStorage.setItem(
        'eventhub_last_edited_user',
        JSON.stringify(editedSubset)
      );


      return mergedUser;

    });
  };


  /* =========================================================
     CONTEXT
  ========================================================= */

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