package com.mediqueue.config;

import java.io.IOException;
import java.sql.Array;
import java.sql.SQLException;

import org.postgresql.util.PGobject;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;

@Configuration
public class DatabaseJsonConfig {
    @Bean
    Jackson2ObjectMapperBuilderCustomizer databaseTypesCustomizer() {
        return builder -> {
            SimpleModule module = new SimpleModule("postgres-database-types");
            module.addSerializer(Array.class, new JsonSerializer<>() {
                @Override
                public void serialize(Array value, JsonGenerator generator, SerializerProvider serializers)
                        throws IOException {
                    try {
                        serializers.defaultSerializeValue(value.getArray(), generator);
                    } catch (SQLException exception) {
                        throw new IOException("Could not serialize a PostgreSQL array", exception);
                    }
                }
            });
            module.addSerializer(PGobject.class, new JsonSerializer<>() {
                @Override
                public void serialize(PGobject value, JsonGenerator generator, SerializerProvider serializers)
                        throws IOException {
                    String content = value.getValue();
                    if (content == null) {
                        generator.writeNull();
                    } else if ("json".equals(value.getType()) || "jsonb".equals(value.getType())) {
                        generator.writeRawValue(content);
                    } else {
                        generator.writeString(content);
                    }
                }
            });
            builder.modulesToInstall(module);
        };
    }
}
