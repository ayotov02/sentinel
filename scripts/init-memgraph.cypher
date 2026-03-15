// Memgraph Schema Indices

CREATE INDEX ON :Aircraft(icao24);
CREATE INDEX ON :Vessel(mmsi);
CREATE INDEX ON :Vessel(imo);
CREATE INDEX ON :Person(name);
CREATE INDEX ON :Organization(name);
CREATE INDEX ON :Location(h3_res4);
CREATE INDEX ON :Event(event_id);
CREATE INDEX ON :Satellite(norad_id);
CREATE INDEX ON :Document(doc_id);
