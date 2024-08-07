import React, { useState, useEffect, useRef } from 'react';
// import ProductGrid from './ProductGrid';
import CurrencySelect from './CurrencySelect';
import {
  SERVER_BASE_URL,
  CONTROLLER_PRODUCT_ID,
  CONTROLLER_CATEGORY_ID,
  VIEW_PRODUCT_ITEMS_PER_PAGE,
  CONTROLLER_PRODUCT_TITLE,
} from '../utils/globals';
import {
  Grid,
  TextField,
  Select,
  MenuItem,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Pagination,
  Menu,
  Button,
  Box,
  useMediaQuery,
} from '@mui/material';
import { arrayToDataUrl } from '../utils/globals';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
// import { fetchProducts } from '../api'; // Assume you have an API function to fetch products
import { useTranslation } from 'react-i18next';

let search = '';
let selectedCategoryId = 0;

// can be overridden by REACT_APP_MAX_MATOMO_CUSTOM_VARIABLES env variable
const DEFAULT_MAX_MATOMO_CUSTOM_VARIABLES = 20;

const SearchIcon = () => <FontAwesomeIcon icon={faMagnifyingGlass} />;

const ProductsView = () => {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(VIEW_PRODUCT_ITEMS_PER_PAGE);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const searchFieldRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();

  const debounceDelay = 80; // milliseconds waiting time after the user pressed a key
  let searchDebounceTimeout = null;

  const isMobile = useMediaQuery('(max-width:960px)');

  const fetchProductData = async (page) => {
    setLoading(true);

    try {
      console.log('ProductsView selectedCurrencies: ', selectedCurrencies);
      const currenciesQueryString = `&currencies=${selectedCurrencies.join(
        ',',
      )}`;

      if(process.env.REACT_APP_NODE_ENV == 'prd'){
        // track product filter with Matomo
        let _paq = window._paq = window._paq || [];
        let customVariableIndex = 1;
        _paq.push(['setCustomVariable', customVariableIndex++, 'Search', search , 'page']);
        _paq.push(['setCustomVariable', customVariableIndex++, 'Page', page , 'page']);
        if(selectedCategoryId){
          for(let i = 0;i < categories.length;i++){
            if(categories[i].id == selectedCategoryId){
              _paq.push(['setCustomVariable', customVariableIndex++, 'Category', categories[i].name , 'page']);
              break;
            }
          }
        }
        let maxVariables = process.env.REACT_APP_MAX_MATOMO_CUSTOM_VARIABLES || DEFAULT_MAX_MATOMO_CUSTOM_VARIABLES;
        for(let i = 0;i < selectedCurrencies.length && customVariableIndex <= maxVariables;i++){
          for(let c = 0;c < currencies.length;c++){
            if(currencies[c].id == selectedCurrencies[i]){
              _paq.push(['setCustomVariable', customVariableIndex++, 'Currencies', currencies[i].name , 'page']);
              break;
            }
          }
        }
        _paq.push(['trackPageView']); 
      }

      const productResponse = await fetch(
        SERVER_BASE_URL +
          CONTROLLER_PRODUCT_ID +
          `?page=${page ? page : currentPage}&limit=${itemsPerPage}&search=${search}&category_id=${selectedCategoryId ? selectedCategoryId : ''}` +
          currenciesQueryString,
      );
      if (!productResponse.ok) {
        throw new Error(
          'Network response was not ok ' + productResponse.statusText,
        );
      }
      const productResponseJson = await productResponse.json();
      console.log('ProductsView productResponseJson: ', productResponseJson);
      setProducts(productResponseJson.data);
      setTotalPages(productResponseJson.totalPages);
    } catch (error) {
      console.error(
        'There has been a problem with your fetch operation:',
        error,
      );
    }

    setLoading(false);
  };

  const fetchCategoryData = async () => {
    try {
      if (categories.length > 0) {
        return;
      }

      const categoriesResponse = await fetch(
        SERVER_BASE_URL + CONTROLLER_CATEGORY_ID,
      );
      if (!categoriesResponse.ok) {
        throw new Error(
          'Network response was not ok ' + categoriesResponse.statusText,
        );
      }
      const categoriesResponseJson = await categoriesResponse.json();
      console.log(
        'ProductsView categoriesResponseJson: ',
        categoriesResponseJson,
      );
      setCategories(categoriesResponseJson);
    } catch (error) {
      console.error(
        'There has been a problem with your fetch operation:',
        error,
      );
    }
  };

  useEffect(() => {
    fetchProductData();
    fetchCategoryData();
  }, [currentPage, itemsPerPage]);

  const handleSearchChange = (event) => {
    const searchValue = event.target.value;
    setSearchTerm(searchValue);

    if (searchValue.length < 3) {
      setSearchResults([]);
      setAnchorEl(null);
      return;
    }

    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      fetchSearchChangeData(searchValue);
    }, debounceDelay);
  };

  const fetchSearchChangeData = async (searchValue) => {
    try {
      const fetchUrl =
        SERVER_BASE_URL +
        CONTROLLER_PRODUCT_ID +
        CONTROLLER_PRODUCT_TITLE +
        `?&search=${searchValue}`;
      const searchChangeResponse = await fetch(fetchUrl);
      if (!searchChangeResponse.ok) {
        throw new Error(
          'Network response was not ok ' + searchChangeResponse.statusText,
        );
      }
      const searchChangeResponseJson = await searchChangeResponse.json();
      console.log('searchChangeResponseJson', searchChangeResponseJson);

      setSearchResults(searchChangeResponseJson); // Assuming this is an array
      if (searchChangeResponseJson.length > 0) {
        setAnchorEl(searchFieldRef.current);
      } else {
        setAnchorEl(null);
      }
    } catch (error) {
      console.error(
        'There has been a problem with your fetch operation:',
        error,
      );
    }
  };

  const selectSearchResult = (result) => {
    setSearchTerm(result);
    setSearchResults([]);
    setAnchorEl(null);
  };

  // Function to get currency string by ID
  const getCurrencyStringById = (currencyId) => {
    const currency = currencies.find((c) => c.id === currencyId);
    return currency
      ? [currency.name, currency.symbol, currency.ticker]
          .filter(Boolean)
          .join(' ')
      : t('(unknown currency)');
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
    // Filter products based on category
  };

  return (
    <>
      <Grid container spacing={2} p={3}>
        <Grid item xs={12}>
          <Box
            sx={{
              display: isMobile ? 'block' : 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : '900px',
              margin: isMobile ? '0px auto' : '30px auto',
              marginBottom: isMobile ? '0px' : '40px',
              justifyContent: 'center',
            }}
          >
            <Select
              //onChange={handleCategoryChange}
              onChange={(event) => (selectedCategoryId = event.target.value)}
              defaultValue=""
              displayEmpty
              sx={{
                width: isMobile ? '100%' : 'auto',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#aaa',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#35a455',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#35a455',
                },
              }}
            >
              <MenuItem value="">
                <em>{t('No Category')}</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {t(category.name)}
                </MenuItem>
              ))}
            </Select>

            <TextField
              label={t('Search')}
              //onChange={handleSearchChange}
              onChange={(event) => (search = event.target.value)}
              onKeyUp={(event) => { console.log("keycode:" + event.keyCode); if (event.key === 'Enter' || event.keyCode === 13) fetchProductData(); } }
              variant="outlined"
              inputRef={searchFieldRef} // Assign the ref to the TextField
              InputLabelProps={{
                style: { color: '#555' },
              }}
              sx={{
                width: isMobile ? '100%' : '100%',
                maxWidth: !isMobile && loading ? '30%' : '100%',
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#35a455',
                  },
                  '&:hover fieldset': {
                    borderColor: '#35a455', // Apply border color on hover
                  },
                },
              }}
            />

            <CurrencySelect
              setCurrencies={setCurrencies}
              selectedItems={selectedCurrencies}
              setSelectedItems={setSelectedCurrencies}
            />

            <Button
              disabled={loading}
              variant="contained" // Use 'contained' for a filled button
              onClick={() => fetchProductData(1)}
              startIcon={<SearchIcon />}
              style={{
                width: isMobile ? '100%' : '200px',
                height: '100%', // Adjust the height as needed
                marginLeft: isMobile ? 0 : 8, // Add some margin if needed
                marginTop: isMobile ? 20 : 0, // Add some margin if needed
                marginBottom: isMobile ? 20 : 0, // Add some margin if needed
                backgroundColor: '#35a455',
              }}
            >
              {t('Search')}
            </Button>
            {loading && <div className="loader"></div>}
          </Box>
        </Grid>

        {!loading &&
          products.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={product.id}>
              <Card>
                <a href={product.url} target="_blank" rel="noopener noreferrer">
                  <CardMedia
                    component="img"
                    height="140"
                    image={arrayToDataUrl(
                      product.thumbnail ? product.thumbnail.data : null,
                    )} // Convert buffer to data URL
                    alt={product.title}
                  />
                </a>

                <CardContent
                  style={{
                    minHeight: '180px',
                    paddingBottom: '15px',
                    position: 'relative',
                  }}
                >
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'black',
                      textDecoration: 'none',
                    }}
                  >
                    <Typography
                      style={{ fontWeight: 900 }}
                      gutterBottom
                      variant="h5"
                      component="h4"
                    >
                      {product.title}
                    </Typography>
                  </a>
                  {/* Displaying price information only if it's greater than 0 */}
                  {(product.price_01 || product.price_01 === 0) &&
                    product.price_01 > 0 && (
                      <Typography variant="body1" color="textSecondary">
                        {t('Price: ')} {product.price_01}{' '}
                        {getCurrencyStringById(product.currency_01_id)}
                      </Typography>
                    )}
                  {(product.price_02 || product.price_02 === 0) &&
                    product.price_02 > 0 && (
                      <Typography variant="body1" color="textSecondary">
                        {product.price_01 > 0
                          ? t('Alternate/additional Price: ')
                          : t('Price: ')}{' '}
                        {product.price_02}{' '}
                        {getCurrencyStringById(product.currency_02_id)}
                      </Typography>
                    )}
                  {
                    <Typography
                      style={{
                        opacity: 0.7,
                        marginTop: '15px',
                        filter: 'saturate(0)',
                        position: 'absolute',
                        bottom: '0px',
                        right: '15px',
                      }}
                      color="textSecondary"
                      gutterBottom
                      component="small"
                    >
                      {'🌐 ' + product.website.name}
                    </Typography>
                  }
                  {/* Additional Product Info */}
                </CardContent>
              </Card>
            </Grid>
          ))}

        {/* Dropdown for Search Results */}
        <Menu
          sx={{ mt: '1px', '& .MuiMenu-paper': { backgroundColor: 'white' } }}
          anchorEl={anchorEl}
          open={Boolean(anchorEl && searchResults.length > 0)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          {searchResults.map((product, index) => (
            <MenuItem key={index}>
              <button
                onClick={() => window.open(product.url, '_blank')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  color: 'inherit',
                  textTransform: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {product.title}
              </button>
            </MenuItem>
          ))}
        </Menu>
      </Grid>

      {!loading && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(event, page) => setCurrentPage(page)}
          style={{
            paddingTop: '30px',
            paddingBottom: '30px',
            display: 'flex',
            justifyContent: 'center',
          }}
        />
      )}
    </>
  );
};

export default ProductsView;
