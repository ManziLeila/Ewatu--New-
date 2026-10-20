-- Tenant module entitlements (commercial module licensing)

CREATE TABLE "tenant_module_entitlements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "limits_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_module_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_module_entitlements_tenant_id_module_id_key" ON "tenant_module_entitlements"("tenant_id", "module_id");
CREATE INDEX "tenant_module_entitlements_tenant_id_idx" ON "tenant_module_entitlements"("tenant_id");

ALTER TABLE "tenant_module_entitlements" ADD CONSTRAINT "tenant_module_entitlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
