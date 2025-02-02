import React, { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Radio, Checkbox, Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';

const FilterAndSortSelect = ({ isOnLeftPane, selectedUsedOrNew, setSelectedUsedOrNew, selectedWithImageOnly, setSelectedWithImageOnly }) => {

  const [anchorEl, setAnchorEl] = useState(null);

  const { t } = useTranslation();

  const isMobile = useMediaQuery('(max-width:960px)');
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleToggle = (value) => {
    setSelectedUsedOrNew(value);
  };

  const handleToggleWithImageOnly = () => {
    selectedWithImageOnly = !selectedWithImageOnly;
    setSelectedWithImageOnly(selectedWithImageOnly);
  }

  return (
    <>
      {isOnLeftPane ? (
        
        <div style={{marginBottom: "30px", boxShadow: "2px 2px 20px #2222", padding: "10px"}}>
          
            {/* Title/Label in bold */}
            <Typography variant="h6" style={{ fontWeight: 'bold', padding: '10px 16px' }}>
            {t('filterAndSort')}
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
            <MenuItem key='withImageOnly' onClick={() => handleToggleWithImageOnly()}>
                <Checkbox
                style={{
                    color: '#35a455',
                    visibility: 'hidden'
                }}
                checked={selectedWithImageOnly == true}
                />
                {t('withImageOnly')}
            </MenuItem> 

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
            {t('filterAndSort')} ▼
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
            <MenuItem key='withImageOnly' onClick={() => handleToggleWithImageOnly()}>
                <Checkbox
                style={{
                    color: '#35a455',
                }}
                checked={selectedWithImageOnly == true}
                />
                {t('withImageOnly')}
            </MenuItem>          
          </Menu>

        </div>    

    )}
    
    </>
    
  )
}

export default FilterAndSortSelect;
