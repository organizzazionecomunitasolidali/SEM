import React, { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Checkbox, useMediaQuery, Typography } from '@mui/material';
import { SERVER_BASE_URL, CONTROLLER_CURRENCY_ID } from '../utils/globals';
import { useTranslation } from 'react-i18next';

const CurrencySelect = ({ isOnLeftPane, setCurrencies, selectedItems, setSelectedItems }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  //   const [selectedItems, setSelectedItems] = useState([]);
  const [items, setItems] = useState([]);

  const { t } = useTranslation();

  const isMobile = useMediaQuery('(max-width:960px)');

  const fetchData = async () => {
    try {
      const currencyResponse = await fetch(
        SERVER_BASE_URL + CONTROLLER_CURRENCY_ID,
      );
      if (!currencyResponse.ok) {
        throw new Error(
          'Network response was not ok ' + currencyResponse.statusText,
        );
      }
      const currencyResponseJson = await currencyResponse.json();
      console.log(
        'CurrencySelect currencyResponseJson: ',
        currencyResponseJson,
      );
      setItems(currencyResponseJson);
      setCurrencies(currencyResponseJson);

      // Initialize selectedItems with all currency IDs
      const allCurrencyIds = currencyResponseJson.map(
        (currency) => currency.id,
      );
      //setSelectedItems(allCurrencyIds);
    } catch (error) {
      console.error(
        'There has been a problem with your fetch operation:',
        error,
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleToggle = (itemId) => {
    const currentIndex = selectedItems.indexOf(itemId);
    const newSelectedItems = [...selectedItems];

    if (currentIndex === -1) {
      newSelectedItems.push(itemId);
    } else {
      newSelectedItems.splice(currentIndex, 1);
    }

    setSelectedItems(newSelectedItems);
  };

  return (
    <>
      {isOnLeftPane ? (
        <div style={{marginBottom: "30px", boxShadow: "2px 2px 20px #2222", padding: "10px"}}>
          
            {/* Title/Label in bold */}
            <Typography variant="h6" style={{ fontWeight: 'bold', padding: '10px 16px' }}>
            {t('Currencies')}
            </Typography>
            {items.map((item) => {
              const itemLabel = [item.name, item.symbol, item.ticker]
                .filter(Boolean)
                .join(' ');
  
              return (
                <MenuItem key={item.id} onClick={() => handleToggle(item.id)}>
                  <Checkbox
                    style={{
                      color: '#35a455',
                    }}
                    checked={selectedItems.includes(item.id)}
                  />
                  {itemLabel || 'Unnamed Item'}
                </MenuItem>
              );
            })}
            
        </div>
      ) : (
        <div>
          <Button
            aria-controls="currency-menu"
            aria-haspopup="true"
            onClick={handleClick}
            sx={{
              color: 'black',
              padding: '15px',
              border: '1px solid #aaa',
              '&:hover': {
                borderColor: '#35a455',
                backgroundColor: 'white',
              },
              width: isMobile ? '100%' : '200px',
            }}
          >
            {t('Currencies')} ▼
          </Button>
          <Menu
            id="currency-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {items.map((item) => {
              const itemLabel = [item.name, item.symbol, item.ticker]
                .filter(Boolean)
                .join(' ');
  
              return (
                <MenuItem key={item.id} onClick={() => handleToggle(item.id)}>
                  <Checkbox
                    style={{
                      color: '#35a455',
                    }}
                    checked={selectedItems.includes(item.id)}
                  />
                  {itemLabel || 'Unnamed Item'}
                </MenuItem>
              );
            })}
          </Menu>
        </div>
      )}
    </>
  );
  
}

export default CurrencySelect;
