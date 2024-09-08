import React, { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Radio, Typography, useMediaQuery } from '@mui/material';
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

          <Menu
                id="usednew-menu"
                open={true} // Always open
                keepMounted
                style={{ display: 'block', position: 'static' }} // Ensure it's displayed as a block element and not floating
          >         

            {/* Title/Label in bold */}
            <Typography variant="h6" style={{ fontWeight: 'bold', padding: '10px 16px' }}>
            {t('usedOrNew')}
            </Typography>
          
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
          <Button
            aria-controls="usednew-menu"
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
            {t('usedOrNew')} ▼
          </Button>
          <Menu
            id="usednew-menu"
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

    )}
    
    </>
    
  )
}

export default UsedOrNewSelect;
