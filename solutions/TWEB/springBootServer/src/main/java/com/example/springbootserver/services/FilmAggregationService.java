package com.example.springbootserver.services;

import com.example.springbootserver.dtos.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.springbootserver.models.*;
import com.example.springbootserver.repositories.*;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FilmAggregationService {
    private static final Logger log = LoggerFactory.getLogger(FilmAggregationService.class); // per il logger
    private final OscarAwardRepo oscarAwardRepo;
    private final MovieRepo movieRepo;
    private final PosterRepo posterRepo;
    private final ActorAppearanceRepo actorAppearanceRepo;
    private final CountryRepo countryRepo;
    private final CrewRepo crewRepo;
    private final GenreRepo genreRepo;
    private final LanguageRepo languageRepo;
    private final ReleaseRepo releaseRepo;
    private final StudioRepo studioRepo;
    private final ThemeRepo themeRepo;

    @Autowired
    public FilmAggregationService(
            OscarAwardRepo oscarAwardRepo,
            MovieRepo movieRepo,
            PosterRepo posterRepo,
            ActorAppearanceRepo actorAppearanceRepo,
            CountryRepo countryRepo,
            CrewRepo crewRepo,
            GenreRepo genreRepo,
            LanguageRepo languageRepo,
            ReleaseRepo releaseRepo,
            StudioRepo studioRepo,
            ThemeRepo themeRepo) {
        this.oscarAwardRepo = oscarAwardRepo;
        this.movieRepo = movieRepo;
        this.posterRepo = posterRepo;
        this.actorAppearanceRepo= actorAppearanceRepo;
        this.countryRepo = countryRepo;
        this.crewRepo = crewRepo;
        this.genreRepo = genreRepo;
        this.languageRepo = languageRepo;
        this.releaseRepo = releaseRepo;
        this.studioRepo = studioRepo;
        this.themeRepo = themeRepo;
    }

    public List<FilmPosterResponse> getFilmsPosters(List<Long> movieIds) {
        return movieRepo.findByIdIn(movieIds).stream()
                .map(movie -> {
                    FilmPosterResponse response = new FilmPosterResponse();
                    response.setId(movie.getId());
                    response.setName(movie.getName());

                    posterRepo.findFirstByMovieId(movie.getId())
                            .ifPresent(poster -> response.setPosterLink(poster.getLink()));

                    return response;
                })
                .collect(Collectors.toList());
    }

    public FilmDetailsResponse getFilmDetails(Long movieId) {
        // Recupera il film principale
        Movie movie = movieRepo.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Film non trovato"));

        // Recupera il poster
        Poster poster = posterRepo.findFirstByMovieId(movieId).orElse(null);

        // Recupera tutte le entità correlate
        List<ActorAppearance> actors = actorAppearanceRepo.findByMovieId(movieId);
        List<Country> countries = countryRepo.findByMovieId(movieId);
        List<Genre> genres = genreRepo.findByMovieId(movieId);
        List<Language> languages = languageRepo.findByMovieId(movieId);
        List<Studio> studios = studioRepo.findByMovieId(movieId);
        List<Theme> themes = themeRepo.findByMovieId(movieId);
        List<Crew> crew = crewRepo.findByMovieId(movieId);
        List<Release> releases = releaseRepo.findByMovieId(movieId);

        // Costruisci e restituisci la risposta
        return new FilmDetailsResponse(
                movie,
                poster,
                actors,
                countries,
                genres,
                languages,
                studios,
                themes,
                crew,
                releases
        );
    }

    // Metodo unico per entrambe le ricerche
    private List<FilmSearchResponse> searchFilms(String query, int limit) {
        String searchTerm = query.toLowerCase().trim(); // Trim per rimuovere spazi extra
        List<Movie> results = new ArrayList<>();

        // 1. Cerca film che iniziano esattamente con la query
        Page<Movie> exactMatches = movieRepo.findByNameStartingWith(
                searchTerm,
                PageRequest.of(0, limit)
        );
        results.addAll(exactMatches.getContent());

        // 2. Se necessario, cerca film che contengono la query
        if (results.size() < limit) {
            int remaining = limit - results.size();
            Page<Movie> containingMatches = movieRepo.findByNameContaining(
                    searchTerm,
                    PageRequest.of(0, remaining)
            );
            results.addAll(containingMatches.getContent());
        }

        // 3. Mappa a DTO con poster
        return results.stream()
                .map(movie -> {
                    FilmSearchResponse response = new FilmSearchResponse();
                    response.setId(movie.getId());
                    response.setName(movie.getName());
                    response.setYear(movie.getDate());
                    posterRepo.findFirstByMovieId(movie.getId())
                            .ifPresent(poster -> response.setPosterLink(poster.getLink()));
                    return response;
                })
                .collect(Collectors.toList());
    }

    public List<FilmSearchResponse> searchFilmsAutocomplete(String query) {
        return searchFilms(query, 5);
    }

    public Page<FilmSearchResponse> searchFilmsFull(String query, Pageable pageable) {
        String searchTerm = query.toLowerCase().trim();
        int pageSize = pageable.getPageSize();
        int pageNumber = pageable.getPageNumber();

        // 1. Prima cerca i film che iniziano con la query
        Page<Movie> exactMatchesPage = movieRepo.findByNameStartingWith(
                searchTerm,
                PageRequest.of(pageNumber, pageSize)
        );

        List<Movie> combinedResults = new ArrayList<>(exactMatchesPage.getContent());

        // 2. Se non abbiamo abbastanza risultati, cerca quelli che contengono la query
        if (combinedResults.size() < pageSize) {
            int remaining = pageSize - combinedResults.size();
            int subPage = 0;

            // Calcola la pagina corretta per i risultati "contiene"
            if (exactMatchesPage.getTotalElements() > 0) {
                subPage = (int) (pageNumber - (exactMatchesPage.getTotalElements() / pageSize));
            }

            Page<Movie> containingMatchesPage = movieRepo.findByNameContainingButNotStartingWith(
                    searchTerm,
                    PageRequest.of(Math.max(subPage, 0), remaining)
            );

            combinedResults.addAll(containingMatchesPage.getContent());
        }

        // 3. Calcola il totale combinato
        long totalExact = exactMatchesPage.getTotalElements();
        Page<Movie> containingTotalPage = movieRepo.findByNameContainingButNotStartingWith(
                searchTerm,
                PageRequest.of(0, 1) // Solo per ottenere il count
        );
        long totalCombined = totalExact + containingTotalPage.getTotalElements();

        // 4. Mappa a DTO
        List<FilmSearchResponse> content = combinedResults.stream()
                .map(movie -> {
                    FilmSearchResponse response = new FilmSearchResponse();
                    response.setId(movie.getId());
                    response.setName(movie.getName());
                    response.setYear(movie.getDate());
                    posterRepo.findFirstByMovieId(movie.getId())
                            .ifPresent(poster -> response.setPosterLink(poster.getLink()));
                    return response;
                })
                .collect(Collectors.toList());

        return new PageImpl<>(
                content,
                pageable,
                totalCombined
        );
    }
    public Page<FilmSearchResponse> advancedSearchFilms(
            String title,
            String actor, String character, String crew, String studio,
            List<String> genres,
            Integer yearFrom, Integer yearTo,
            String oscarStatus,
            String sort,
            Pageable pageable) {

        // 1. Crea la specification di base (titolo + anno)
        Specification<Movie> spec = Specification.where(createBaseSpec(title, yearFrom, yearTo));

        // 2. Aggiungi filtro relazionale (solo uno sarà attivo)
        spec = spec.and(createRelationSpec(actor, character, crew, studio, genres));

        // 3. Esegui query SENZA PAGINAZIONE prima
        List<Movie> allMovies = movieRepo.findAll(spec);

        // 4. Filtra per Oscar se necessario
        if (oscarStatus != null && !oscarStatus.equals("any")) {
            allMovies = allMovies.stream()
                    .filter(movie -> hasOscarMatch(movie, oscarStatus))
                    .collect(Collectors.toList());
        }

        // 5. Ordina i risultati
        Sort sortObj = buildSort(sort);
        allMovies.sort(createMovieComparator(sortObj));

        // 6. Applica paginazione MANUALE
        return paginateList(allMovies, pageable, sortObj);
    }
    // Nuovo metodo per costruire l'oggetto Sort
    private Sort buildSort(String sortParam) {
        if (sortParam == null || sortParam.isEmpty()) {
            return Sort.by(Sort.Direction.ASC, "id");
        }

        String[] parts = sortParam.split("_");
        if (parts.length != 2) {
            return Sort.by(Sort.Direction.ASC, "id");
        }

        String property = parts[0];
        Sort.Direction direction = parts[1].equalsIgnoreCase("desc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        return Sort.by(direction, property).and(Sort.by("id"));
    }
    // Helper per l'ordinamento
    private Comparator<Movie> createMovieComparator(Sort sort) {
        List<Comparator<Movie>> comparators = new ArrayList<>();

        for (Sort.Order order : sort) {
            Comparator<Movie> comparator = (m1, m2) -> {
                switch (order.getProperty()) {
                    case "date":
                        return order.isAscending() ?
                                m1.getDate().compareTo(m2.getDate()) :
                                m2.getDate().compareTo(m1.getDate());
                    case "id":
                        return order.isAscending() ?
                                m1.getId().compareTo(m2.getId()) :
                                m2.getId().compareTo(m1.getId());
                    default:
                        return 0;
                }
            };
            comparators.add(comparator);
        }

        return comparators.stream()
                .reduce(Comparator::thenComparing)
                .orElse((m1, m2) -> 0);
    }
    private Page<FilmSearchResponse> paginateList(List<Movie> movies, Pageable pageable, Sort sort) {
        int totalElements = movies.size();
        int pageSize = pageable.getPageSize();
        int currentPage = pageable.getPageNumber();
        int startItem = currentPage * pageSize;

        List<Movie> pageContent;
        if (startItem >= totalElements) {
            pageContent = Collections.emptyList();
        } else {
            int endItem = Math.min(startItem + pageSize, totalElements);
            pageContent = movies.subList(startItem, endItem);
        }

        return new PageImpl<>(
                pageContent.stream().map(this::mapToFilmSearchResponse).collect(Collectors.toList()),
                PageRequest.of(currentPage, pageSize, sort),
                totalElements
        );
    }
    private boolean hasOscarMatch(Movie movie, String oscarStatus) {
        List<OscarAward> awards = oscarAwardRepo.findByFilmContainingIgnoreCaseAndYearFilmBetween(
                movie.getName(),
                movie.getDate() - 1,
                movie.getDate() + 1
        );

        return oscarStatus.equals("winner")
                ? awards.stream().anyMatch(OscarAward::getWinner)
                : !awards.isEmpty();
    }
    private Specification<Movie> createBaseSpec(String title, Integer yearFrom, Integer yearTo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (title != null && !title.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + title.toLowerCase() + "%"));
            }
            if (yearFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), yearFrom));
            }
            if (yearTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), yearTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<Movie> createRelationSpec(String actor, String character, String crew,
                                                    String studio, List<String> genres) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Verifica che sia specificato solo un tipo di ricerca relazionale
            int relationFilters = 0;
            if (actor != null) relationFilters++;
            if (character != null) relationFilters++;
            if (crew != null) relationFilters++;
            if (studio != null) relationFilters++;

            if (relationFilters > 1) {
                throw new IllegalArgumentException("Puoi specificare solo un filtro tra attore, personaggio, crew e studio");
            }

            // Aggiungi il filtro specificato (solo uno sarà presente)
            if (actor != null) {
                predicates.add(createRelationPredicate(root, query, cb, ActorAppearance.class, "actorName", actor));
            }
            if (character != null) {
                predicates.add(createRelationPredicate(root, query, cb, ActorAppearance.class, "characterName", character));
            }
            if (crew != null) {
                predicates.add(createRelationPredicate(root, query, cb, Crew.class, "name", crew));
            }
            if (studio != null) {
                predicates.add(createRelationPredicate(root, query, cb, Studio.class, "studio", studio));
            }

            // I generi possono sempre essere aggiunti in AND con gli altri filtri
            if (genres != null && !genres.isEmpty()) {
                predicates.add(createGenrePredicate(root, query, cb, genres));
            }

            return predicates.isEmpty() ? null : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate createRelationPredicate(Root<Movie> root, CriteriaQuery<?> query, CriteriaBuilder cb,
                                              Class<?> entityClass, String fieldName, String searchTerm) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<?> entityRoot = subquery.from(entityClass);

        return cb.in(root.get("id")).value(
                subquery.select(entityRoot.get("movieId"))
                        .where(cb.like(cb.lower(entityRoot.get(fieldName)), "%" + searchTerm.toLowerCase() + "%"))
        );
    }

    private Predicate createGenrePredicate(Root<Movie> root, CriteriaQuery<?> query, CriteriaBuilder cb, List<String> genres) {
        Subquery<Long> subquery = query.subquery(Long.class);
        Root<Genre> genreRoot = subquery.from(Genre.class);

        return cb.in(root.get("id")).value(
                subquery.select(genreRoot.get("movieId"))
                        .where(genreRoot.get("genre").in(genres))
        );
    }

    private FilmSearchResponse mapToFilmSearchResponse(Movie movie) {
        FilmSearchResponse response = new FilmSearchResponse();
        response.setId(movie.getId());
        response.setName(movie.getName());
        response.setYear(movie.getDate());
        posterRepo.findFirstByMovieId(movie.getId())
                .ifPresent(poster -> response.setPosterLink(poster.getLink()));
        return response;
    }

   /* public List<OscarFilmResponse> getFilmsByGenreWithOscars(String genre, int limit) {
        // 1. Trova tutti i film del genere specificato
        List<Long> movieIds = genreRepo.findMovieIdsByGenre(genre);

        if (movieIds.isEmpty()) {
            return Collections.emptyList();
        }

        // 2. Recupera i film completi (non solo projection)
        List<Movie> movies = movieRepo.findByIdIn(movieIds);

        // 3. Mappa per nome+anno per matching con gli Oscar
        Map<String, Movie> movieMap = new HashMap<>();
        for (Movie movie : movies) {
            String key = movie.getName().toLowerCase() + "|" + movie.getDate();
            movieMap.putIfAbsent(key, movie);
        }

        // 4. Recupera TUTTI gli Oscar che potrebbero corrispondere ai film
        List<OscarAward> allAwards = oscarAwardRepo.findAll();

        // 5. Mappa per film (id) con lista di award corrispondenti
        Map<Long, List<OscarAward>> awardsByMovieId = new HashMap<>();

        for (OscarAward award : allAwards) {
            String awardKey = award.getFilm().toLowerCase() + "|" + award.getYearFilm();

            // Cerca corrispondenza esatta o nell'anno ±1
            for (int yearOffset = 0; yearOffset <= 1; yearOffset++) {
                String key1 = award.getFilm().toLowerCase() + "|" + (award.getYearFilm() + yearOffset);
                String key2 = award.getFilm().toLowerCase() + "|" + (award.getYearFilm() - yearOffset);

                if (movieMap.containsKey(key1)) {
                    Movie matchedMovie = movieMap.get(key1);
                    awardsByMovieId.computeIfAbsent(matchedMovie.getId(), k -> new ArrayList<>()).add(award);
                    break;
                }
                if (movieMap.containsKey(key2)) {
                    Movie matchedMovie = movieMap.get(key2);
                    awardsByMovieId.computeIfAbsent(matchedMovie.getId(), k -> new ArrayList<>()).add(award);
                    break;
                }
            }
        }

        // 6. Recupera i poster in batch
        Map<Long, String> posterMap = posterRepo.findByMovieIdIn(movieIds).stream()
                .collect(Collectors.toMap(Poster::getMovieId, Poster::getLink));

        // 7. Costruisci la lista di risultati
        List<OscarFilmResponse> results = new ArrayList<>();

        for (Movie movie : movies) {
            List<OscarAward> awards = awardsByMovieId.getOrDefault(movie.getId(), Collections.emptyList());

            if (!awards.isEmpty()) {
                int wins = (int) awards.stream().filter(OscarAward::getWinner).count();
                int nominations = awards.size();

                results.add(new OscarFilmResponse(
                        movie.getId(),
                        movie.getName(),
                        movie.getDate(),
                        posterMap.get(movie.getId()),
                        wins,
                        nominations
                ));
            }
        }

        // 8. Ordina prima per vittorie (DESC), poi per nomination (DESC)
        results.sort((a, b) -> {
            if (b.getOscarWins() != a.getOscarWins()) {
                return Integer.compare(b.getOscarWins(), a.getOscarWins());
            }
            return Integer.compare(b.getOscarNominations(), a.getOscarNominations());
        });

        // 9. Limita i risultati
        return results.stream().limit(limit).collect(Collectors.toList());
    }*/
   public List<OscarFilmResponse> getFilmsByGenreWithOscars(String genre, int limit) {
       // 1. Carica tutti gli Oscar in memoria
       List<OscarAward> allAwards = oscarAwardRepo.findAll();

       // 2. Prepara struttura per matching veloce
       Map<String, List<OscarAward>> awardsMap = new HashMap<>();
       for (OscarAward award : allAwards) {
           String key = award.getFilm().toLowerCase() + "|" + award.getYearFilm();
           awardsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(award);
       }

       // 3. Trova tutti gli ID dei film del genere
       List<Long> allMovieIds = genreRepo.findMovieIdsByGenre(genre);
       if (allMovieIds.isEmpty()) {
           return Collections.emptyList();
       }

       // 4. Processa a batch per evitare limiti di parametri
       Map<Long, OscarFilmResponse> resultsMap = new HashMap<>();
       int batchSize = 30000;

       for (int i = 0; i < allMovieIds.size(); i += batchSize) {
           List<Long> batchIds = allMovieIds.subList(i, Math.min(i + batchSize, allMovieIds.size()));

           // 5. Carica film e poster del batch corrente
           List<Movie> batchMovies = movieRepo.findByIdIn(batchIds);
           Map<Long, String> posterMap = posterRepo.findByMovieIdIn(batchIds).stream()
                   .collect(Collectors.toMap(Poster::getMovieId, Poster::getLink));

           // 6. Per ogni film nel batch
           for (Movie movie : batchMovies) {
               int wins = 0;
               int nominations = 0;

               // 7. Cerca corrispondenze con gli Oscar
               for (int yearOffset = -1; yearOffset <= 1; yearOffset++) {
                   String key = movie.getName().toLowerCase() + "|" + (movie.getDate() + yearOffset);
                   List<OscarAward> matched = awardsMap.getOrDefault(key, Collections.emptyList());
                   nominations += matched.size();
                   wins += (int) matched.stream().filter(OscarAward::getWinner).count();
               }

               if (nominations > 0) {
                   resultsMap.put(movie.getId(), new OscarFilmResponse(
                           movie.getId(),
                           movie.getName(),
                           movie.getDate(),
                           posterMap.get(movie.getId()),
                           wins,
                           nominations
                   ));
               }
           }
       }

       // 8. Ordina i risultati globali
       List<OscarFilmResponse> sortedResults = new ArrayList<>(resultsMap.values());
       sortedResults.sort((a, b) -> {
           int winCompare = Integer.compare(b.getOscarWins(), a.getOscarWins());
           return winCompare != 0 ? winCompare :
                   Integer.compare(b.getOscarNominations(), a.getOscarNominations());
       });

       // 9. Limita i risultati
       return sortedResults.stream().limit(limit).collect(Collectors.toList());
   }
}
