import React, { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Radio, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';

const UsedOrNewSelect = ({ isOnLeftPane, selectedUsedOrNew, setSelectedUsedOrNew }) => {

  const [anchorEl, setAnchorEl] = useState(null);

  const { t } = useTranslation();

  const isMobile = useMediaQuery('(max-width:960px)');
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleToggle = (value) => {
    setSelectedUsedOrNew(value);
  };

  return (
    <>
      {isOnLeftPane ? (

        <div>
          <Button
            aria-controls="simple-menu"
            aria-haspopup="true"
            onClick={handleClick}
            sx={{
              color: 'black',
              padding: '15px',
              border: '1px solid #aaa',
              '&:hover': {
                borderColor: '#35a455', // Apply border color on hover
                backgroundColor: 'white',
              },
              width: isMobile ? '100%' : '300px',
            }}
          >
            {t(selectedUsedOrNew)} ▼
          </Button>
          <Menu
            id="simple-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem key='newFirst' onClick={() => handleToggle('newFirst')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'newFirst'}
                />
                {t('newFirst')}
            </MenuItem>    
            <MenuItem key='usedFirst' onClick={() => handleToggle('usedFirst')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'usedFirst'}
                />
                {t('usedFirst')}
            </MenuItem>   
            <MenuItem key='newOnly' onClick={() => handleToggle('newOnly')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'newOnly'}
                />
                {t('newOnly')}
            </MenuItem>   
            <MenuItem key='usedOnly' onClick={() => handleToggle('usedOnly')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'usedOnly'}
                />
                {t('usedOnly')}
            </MenuItem>           
          </Menu>

        </div>      
      ) : (
        
        <div>

          <Menu
                id="simple-menu"
                open={true} // Always open
                keepMounted
                style={{ display: 'block', position: 'static' }} // Ensure it's displayed as a block element and not floating
          >         
            <MenuItem key='newFirst' onClick={() => handleToggle('newFirst')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'newFirst'}
                />
                {t('newFirst')}
            </MenuItem>    
            <MenuItem key='usedFirst' onClick={() => handleToggle('usedFirst')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'usedFirst'}
                />
                {t('usedFirst')}
            </MenuItem>   
            <MenuItem key='newOnly' onClick={() => handleToggle('newOnly')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'newOnly'}
                />
                {t('newOnly')}
            </MenuItem>   
            <MenuItem key='usedOnly' onClick={() => handleToggle('usedOnly')}>
                <Radio
                style={{
                    color: '#35a455',
                }}
                checked={selectedUsedOrNew == 'usedOnly'}
                />
                {t('usedOnly')}
            </MenuItem> 
          </Menu>

        </div>
        
    )}
    
    </>
    
  )
}

export default UsedOrNewSelect;
