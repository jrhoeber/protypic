resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.enabled]
}

resource "google_firestore_index" "prototypes_owner_created" {
  collection = "prototypes"

  fields {
    field_path = "ownerUid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.default]
}

resource "google_firestore_index" "api_tokens_owner_active" {
  collection = "apiTokens"

  fields {
    field_path = "ownerUid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "revokedAt"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
  fields {
    field_path = "__name__"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.default]
}
