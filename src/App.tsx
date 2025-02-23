import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  createColumnHelper,
} from '@tanstack/react-table';

interface Property {
  id: string;
  url: string;
  title: string;
  platform: string;
  image: string;
  totalPrice: number;
  checkIn: Date | null;
  checkOut: Date | null;
  nights: number;
}

interface PropertyFormData {
  url: string;
  totalPrice: number;
  checkIn: Date | null;
  checkOut: Date | null;
}

const PLATFORMS = {
  'airbnb.com': {
    name: 'Airbnb',
    checkInParam: 'checkin',
    checkOutParam: 'checkout',
    dateFormat: 'YYYY-MM-DD',
  },
  'vrbo.com': {
    name: 'VRBO',
    checkInParam: 'checkin',
    checkOutParam: 'checkout',
    dateFormat: 'YYYY-MM-DD',
  },
  'booking.com': {
    name: 'Booking.com',
    checkInParam: ['checkin_year', 'checkin_month', 'checkin_monthday'],
    checkOutParam: ['checkout_year', 'checkout_month', 'checkout_monthday'],
    dateFormat: 'fragments',
  },
  'tripadvisor.com': {
    name: 'TripAdvisor',
    checkInParam: 'checkin',
    checkOutParam: 'checkout',
    dateFormat: 'YYYY-MM-DD',
  },
};

// Since this interface is not being used anywhere in the code,
// we can safely remove it. If it's needed in the future,
// it can be added back with proper implementation.

// Since this interface is not being used, we can remove it

const App: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalPrice', desc: false }]);
  const [priceSubmitted, setPriceSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    url: '',
    totalPrice: 0,
    checkIn: null,
    checkOut: null,
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const savedData = localStorage.getItem('rentalComparisonData');
    if (savedData) {
      const { properties: savedProperties, guestCount: savedGuestCount } = JSON.parse(savedData);
      setProperties(savedProperties.map((p: any) => ({
        ...p,
        checkIn: p.checkIn ? new Date(p.checkIn) : null,
        checkOut: p.checkOut ? new Date(p.checkOut) : null,
      })));
      setGuestCount(savedGuestCount);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rentalComparisonData', JSON.stringify({ properties, guestCount }));
  }, [properties, guestCount]);

  const getPlatformFromUrl = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return Object.entries(PLATFORMS).find(([domain]) => hostname.includes(domain));
    } catch {
      return null;
    }
  };

  const padZero = (num: number): string => {
    return num.toString().padStart(2, '0');
  };

  const parseUrlData = (url: string): { checkIn: Date | null; checkOut: Date | null; totalPrice: number | null } => {
    try {
      const urlObj = new URL(url);
      const platform = getPlatformFromUrl(url);
  
      if (!platform) return { checkIn: null, checkOut: null, totalPrice: null };
  
      const [, platformConfig] = platform;
      const searchParams = new URLSearchParams(urlObj.search);
      const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
      
      let checkInDate = null;
      let checkOutDate = null;
  
      // Handle Booking.com's fragmented date format
      if (platformConfig.dateFormat === 'fragments') {
        const getFragmentedDate = (prefix: string) => {
          const year = searchParams.get(`${prefix}_year`) || hashParams.get(`${prefix}_year`);
          const month = searchParams.get(`${prefix}_month`) || hashParams.get(`${prefix}_month`);
          const day = searchParams.get(`${prefix}_monthday`) || hashParams.get(`${prefix}_monthday`);
          
          if (year && month && day) {
            return `${year}-${padZero(parseInt(month))}-${padZero(parseInt(day))}`;
          }
          return null;
        };
  
        const checkInStr = getFragmentedDate('checkin');
        const checkOutStr = getFragmentedDate('checkout');
  
        if (checkInStr) checkInDate = new Date(checkInStr);
        if (checkOutStr) checkOutDate = new Date(checkOutStr);
      } else {
        // Handle standard date format (YYYY-MM-DD)
        const checkInStr = Array.isArray(platformConfig.checkInParam) 
          ? null 
          : searchParams.get(platformConfig.checkInParam) || hashParams.get(platformConfig.checkInParam);
        const checkOutStr = Array.isArray(platformConfig.checkOutParam) 
          ? null 
          : searchParams.get(platformConfig.checkOutParam) || hashParams.get(platformConfig.checkOutParam);
  
        // Special handling for VRBO's alternative parameter names
        let vrboCheckIn = null;
        let vrboCheckOut = null;
        if (!checkInStr && urlObj.hostname.includes('vrbo.com')) {
          vrboCheckIn = searchParams.get('startDate') || hashParams.get('startDate');
          vrboCheckOut = searchParams.get('endDate') || hashParams.get('endDate');
          if (vrboCheckIn) checkInDate = new Date(vrboCheckIn);
          if (vrboCheckOut) checkOutDate = new Date(vrboCheckOut);
        }
  
        // If dates are not found in parameters, try to find them in the URL path
        if (!checkInStr || !checkOutStr) {
          const datePattern = /\d{4}-\d{2}-\d{2}/g;
          const datesInPath = urlObj.pathname.match(datePattern);
          if (datesInPath && datesInPath.length >= 2) {
            try {
              checkInDate = new Date(datesInPath[0]);
              checkOutDate = new Date(datesInPath[1]);
            } catch {}
          }
        } else {
          try {
            if (checkInStr) checkInDate = new Date(checkInStr);
            if (checkOutStr) checkOutDate = new Date(checkOutStr);
          } catch {}
        }
      }
  
      // Validate dates
      if (checkInDate && isNaN(checkInDate.getTime())) checkInDate = null;
      if (checkOutDate && isNaN(checkOutDate.getTime())) checkOutDate = null;
  
      return {
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalPrice: null, // Price is always user-entered
      };
    } catch {
      return { checkIn: null, checkOut: null, totalPrice: null };
    }
  };

  const fetchMetadata = async (_url: string) => {
    // For now, return default values since the API endpoint is not implemented
    return {
      title: `Property ${properties.length + 1}`,
      image: ''
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (properties.length >= 5) {
      setError('Upgrade to add more properties');
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      setError('Invalid URL');
      return;
    }

    if (formData.totalPrice <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    if (!formData.checkIn || !formData.checkOut) {
      setError('Please select both check-in and check-out dates');
      return;
    }

    if (formData.checkIn >= formData.checkOut) {
      setError('Check-out date must be after check-in date');
      return;
    }

    const platform = getPlatformFromUrl(formData.url);
    if (!platform) {
      setError('Unsupported rental platform');
      return;
    }

    const metadata = await fetchMetadata(formData.url);
    const nights = differenceInDays(formData.checkOut, formData.checkIn);

    const newProperty: Property = {
      id: Date.now().toString(),
      url: formData.url,
      title: metadata.title,
      platform: platform[1].name,
      image: metadata.image,
      totalPrice: formData.totalPrice,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      nights,
    };

    setProperties([...properties, newProperty]);
    setFormData({ url: '', totalPrice: 0, checkIn: null, checkOut: null });
    setPriceSubmitted(false);
  };

  const columnHelper = createColumnHelper<Property>();
  const columns = [
    columnHelper.accessor('title', {
      cell: info => (
        <div className="flex items-center gap-4">
          {info.row.original.image && (
            <img
              src={info.row.original.image}
              alt={info.getValue()}
              className="w-[100px] h-[100px] object-cover rounded-lg"
            />
          )}
          <a
            href={info.row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {info.getValue()}
          </a>
        </div>
      ),
      header: 'Property',
    }),
    columnHelper.accessor('platform', {
      header: 'Platform',
    }),
    columnHelper.accessor('totalPrice', {
      cell: info => `$${info.getValue().toFixed(2)}`,
      header: 'Total Price',
    }),
    columnHelper.accessor(
      row => row.totalPrice / guestCount,
      {
        id: 'pricePerPerson',
        cell: info => `$${info.getValue().toFixed(2)}`,
        header: 'Price per Person',
      }
    ),
    columnHelper.accessor(
      row => row.totalPrice / (row.nights * guestCount),
      {
        id: 'pricePerDayPerPerson',
        cell: info => `$${info.getValue().toFixed(2)}`,
        header: 'Price per Day per Person',
      }
    ),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const property = info.row.original;
              setFormData({
                url: property.url,
                totalPrice: property.totalPrice,
                checkIn: property.checkIn,
                checkOut: property.checkOut,
              });
              setProperties(properties.filter(p => p.id !== property.id));
            }}
            className="btn-secondary"
          >
            Edit
          </button>
          <button
            onClick={() => setProperties(properties.filter(p => p.id !== info.row.original.id))}
            className="btn-secondary text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: properties,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="mb-8">Rental Property Comparison</h1>
      <p className="mb-6 text-gray-600">
        Paste the URL after selecting dates on the rental site, then enter the total price shown.
      </p>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="label">
              Property URL
            </label>
            <input
              type="text"
              id="url"
              value={formData.url}
              onChange={e => {
                setFormData(prev => {
                  const newData = { ...prev, url: e.target.value };
                  const urlData = parseUrlData(e.target.value);
                  const updates: Partial<PropertyFormData> = {};
                  
                  if (urlData.checkIn && urlData.checkOut) {
                    updates.checkIn = urlData.checkIn;
                    updates.checkOut = urlData.checkOut;
                  }
                  
                  if (urlData.totalPrice !== null) {
                    updates.totalPrice = urlData.totalPrice;
                  }
                  
                  if (Object.keys(updates).length > 0) {
                    return { ...newData, ...updates };
                  }
                  return newData;
                });
              }}
              className="input"
              placeholder="https://"
            />
          </div>

          {(!formData.checkIn || !formData.checkOut) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkIn" className="label">
                  Check-in Date
                </label>
                <DatePicker
                  id="checkIn"
                  selected={formData.checkIn}
                  onChange={date => setFormData(prev => ({ ...prev, checkIn: date }))}
                  className="input"
                  placeholderText="Select check-in date"
                />
              </div>
          
              <div>
                <label htmlFor="checkOut" className="label">
                  Check-out Date
                </label>
                <DatePicker
                  id="checkOut"
                  selected={formData.checkOut}
                  onChange={date => setFormData(prev => ({ ...prev, checkOut: date }))}
                  className="input"
                  placeholderText="Select check-out date"
                  minDate={formData.checkIn || undefined}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!priceSubmitted && (
              <div>
                <label htmlFor="totalPrice" className="label">
                  Total Price
                </label>
                <input
                  type="number"
                  id="totalPrice"
                  value={formData.totalPrice || ''}
                  onChange={e => setFormData(prev => ({ ...prev, totalPrice: parseFloat(e.target.value) || 0 }))}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="Enter total price"
                />
              </div>
            )}
          
            <div>
              <label htmlFor="guests" className="label">
                Number of Guests
              </label>
              <input
                type="number"
                id="guests"
                value={guestCount}
                onChange={e => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="input"
                min="1"
                placeholder="Enter number of guests"
              />
            </div>
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <button type="submit" className="btn-primary">
            Add Property
          </button>
        </form>
      </div>

      {properties.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="p-4 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                    >
                      {header.isPlaceholder ? null : (
                        typeof header.column.columnDef.header === 'function'
                          ? header.column.columnDef.header({
                              table: table,
                              header: header,
                              column: header.column,
                            })
                          : header.column.columnDef.header
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-t border-gray-200 hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-4">
                      {typeof cell.column.columnDef.cell === 'function' 
                        ? cell.column.columnDef.cell(cell.getContext())
                        : cell.column.columnDef.cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default App;