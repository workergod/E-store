import { MasterDataPageTemplate } from './MasterDataPageTemplate';
import { rackLocationRepository } from '../../../repositories/RackLocationRepository';

export default function RackLocationsPage() {
  return (
    <MasterDataPageTemplate 
      title="Rack Locations"
      description="Manage warehouse storage locations (e.g. A1, Rack-B)."
      entityName="Rack Location"
      repository={rackLocationRepository}
    />
  );
}
