CREATE VIRTUAL TABLE expenses_fts USING fts5(
    note,
    content = 'expenses',
    content_rowid = 'id',
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER expenses_fts_after_insert AFTER INSERT ON expenses BEGIN
  INSERT INTO expenses_fts (rowid, note) VALUES (new.id, new.note);
END;

CREATE TRIGGER expenses_fts_after_delete AFTER DELETE ON expenses BEGIN
  INSERT INTO expenses_fts (expenses_fts, rowid, note) VALUES ('delete', old.id, old.note);
END;

CREATE TRIGGER expenses_fts_after_update_note AFTER UPDATE OF note ON expenses BEGIN
  INSERT INTO expenses_fts (expenses_fts, rowid, note) VALUES ('delete', old.id, old.note);
  INSERT INTO expenses_fts (rowid, note) VALUES (new.id, new.note);
END;

INSERT INTO expenses_fts (expenses_fts) VALUES ('rebuild');
