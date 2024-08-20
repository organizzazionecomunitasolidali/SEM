import React, { useContext, useState, useEffect } from 'react';
import { useMediaQuery, Box } from '@mui/material';
import {
  AppBar,
  Toolbar,
  Typography,
} from '@mui/material';
// import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import i18n from 'i18next';
import LanguageSelect from './LanguageSelect';
import { useTranslation } from 'react-i18next';
import Logo from '../assets/logo270.png';

function TopBarNoLogin() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useContext(UserContext);

  const { t } = useTranslation();

  useEffect(() => {
    // Update local login state based on global user context
    if (user.isLoggedIn) {
      navigate('/');
    }
  }, [user, navigate]);
  
  const appName = process.env.REACT_APP_NAME
    ? process.env.REACT_APP_NAME
    : 'SEM';

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  /* // in <Toolbar> we removed this and replaced it with the img
        <Typography variant="h6" style={{ flexGrow: 1 }}>
          {appName}
        </Typography>
  */

  return (
    <AppBar
      sx={{ bgcolor: 'white', color: 'black', padding: '10px' }}
      position="static"
    >
      <Toolbar>
        <Box
          component="img"
          sx={{
            height: 64,
            marginRight: 4,
          }}
          alt={appName}
          src={Logo}
        />
        <Typography variant="h6" style={{ flexGrow: 1, fontWeight: 900 }}>
          {appName}
        </Typography>
        <LanguageSelect onChange={changeLanguage} />
      </Toolbar>
    </AppBar>
  );
}

export default TopBarNoLogin;
