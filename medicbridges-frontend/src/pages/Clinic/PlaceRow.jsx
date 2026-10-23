import { Link } from 'react-router-dom';
import { Phone, ChevronRight } from 'lucide-react';
import { formatAddress, formatDistance } from '../../lib/format';

/**
 * One location or pharmacy row. With `to`, the whole row links there (a
 * stretched link) while the call button stays separately clickable.
 * Styled by the `.loc*` classes in the Clinic page's style block.
 */
const PlaceRow = ({ place, callLabel, pills, to }) => {
  const address = formatAddress(place);
  const distance = formatDistance(place.distance_m);
  return (
    <div className={`loc${to ? ' loc-link' : ''}`}>
      <div className="loc-text">
        {to ? (
          <Link to={to} className="loc-name loc-stretch">{place.name}</Link>
        ) : (
          <div className="loc-name">{place.name}</div>
        )}
        {address && <div className="loc-addr">{address}</div>}
        {pills}
      </div>
      {distance && <div className="loc-dist">{distance}</div>}
      {place.phone && (
        <a className="loc-call" href={`tel:${place.phone}`} aria-label={`${callLabel} ${place.phone}`}>
          <Phone size={16} />
        </a>
      )}
      {to && <ChevronRight size={16} className="loc-chev" aria-hidden="true" />}
    </div>
  );
};

export default PlaceRow;
