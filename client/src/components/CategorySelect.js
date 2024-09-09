import React, { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Checkbox, useMediaQuery, Typography } from '@mui/material';
import { SERVER_BASE_URL, CONTROLLER_CATEGORY_ID } from '../utils/globals';
import { useTranslation } from 'react-i18next';

const CategorySelect = ({ isOnLeftPane, setCategories, selectedItems, setSelectedItems }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  //   const [selectedItems, setSelectedItems] = useState([]);
  const [items, setItems] = useState([]);

  const { t } = useTranslation();

  const isMobile = useMediaQuery('(max-width:960px)');

  const fetchData = async () => {
    try {
      const categoryResponse = await fetch(
        SERVER_BASE_URL + CONTROLLER_CATEGORY_ID,
      );
      if (!categoryResponse.ok) {
        throw new Error(
          'Network response was not ok ' + categoryResponse.statusText,
        );
      }
      const categoryResponseJson = await categoryResponse.json();
      console.log(
        'CategorySelect categoryResponseJson: ',
        categoryResponseJson,
      );
      setItems(categoryResponseJson);
      setCategories(categoryResponseJson);

      // Initialize selectedItems with all category IDs
      const allCategoryIds = categoryResponseJson.map(
        (category) => category.id,
      );
      //setSelectedItems(allCategoryIds);
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
            {t('Categories')}
            </Typography>
            {items.map((item) => {
              const itemLabel = [t(item.name)]
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
            aria-controls="categories-menu"
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
              width: isMobile ? '100%' : '200px',
            }}
          >
            {t('Categories')} ▼
          </Button>
          <Menu
            id="categories-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {items.map((item) => {
              const itemLabel = [t(item.name)]
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
    
  )

}

export default CategorySelect;
