import React, { useState, useEffect } from 'react';
import { Button, Menu, MenuItem, Checkbox, useMediaQuery } from '@mui/material';
import { SERVER_BASE_URL, CONTROLLER_CATEGORY_ID } from '../utils/globals';
import { useTranslation } from 'react-i18next';

const CategorySelect = ({ isVisible=true, isOnLeftPane=false, setCategories, selectedItems, setSelectedItems }) => {
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

    (isVisible && !isOnLeftPane &&

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
          width: isMobile ? '100%' : '200px',
        }}
      >
        {t('Categories')} ▼
      </Button> &&
      <Menu
        id="simple-menu"
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
    
    )

    (isVisible && isOnLeftPane &&
    <div>
      <Menu
            id="simple-menu"
            open={true} // Always open
            keepMounted
            style={{ display: 'block', position: 'static' }} // Ensure it's displayed as a block element and not floating
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
    )
    
  )

}

export default CategorySelect;
